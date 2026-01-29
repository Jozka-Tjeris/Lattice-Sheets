import { executeMutation } from "./executors/index";
import type { MutationResults, QueueItem, TableMutation } from "./mutationTypes";

const queues = new Map<string, QueueItem<TableMutation>[]>();
const running = new Set<string>();

function getQueueKey(mutation: TableMutation): string {
  switch (mutation.type) {
    case "createTable":
      return mutation.baseId; // Tables are locked by Base during creation
    case "deleteTable":
    case "renameTable":
      return mutation.tableId;
    case "addRow":
    case "addColumn":
    case "updateCells":
      return mutation.tableId;
    case "createView":
    case "updateView":
      return mutation.tableId;
    default:
      // If some mutations don't have tableId, they must have a fallback
      return (mutation as { tableId: string }).tableId; 
  }
}

export function enqueueTableMutation<M extends TableMutation>(
  mutation: M,
  overrideKey?: string
): Promise<{ result: MutationResults[M["type"]] }> {
  return new Promise((resolve, reject) => {
    const mutationId = crypto.randomUUID();

    const key = overrideKey ?? getQueueKey(mutation);
    
    const item: QueueItem<M> = {
      id: mutationId,
      mutation,
      createdAt: Date.now(),
      attempt: 0,
      resolve,
      reject,
    };

    const queue = queues.get(key) ?? [];
    queue.push(item as unknown as QueueItem<TableMutation>);
    queues.set(key, queue);

    void processQueue(key);
  });
}

async function processQueue(tableId: string) {
  if (running.has(tableId)) return;

  const queue = queues.get(tableId);
  if (!queue || queue.length === 0) return;

  running.add(tableId);
  const item = queue[0]!;

  try {
    const result = await executeMutation(item.mutation);
    item.resolve({ result });
    queue.shift();
  } catch (err) {
    item.attempt++;
    console.error("Mutation failed", item.mutation, err);
    // optional retry/backoff here
    if (item.attempt > 2) {
      queue.shift(); // drop permanently
      item.reject(err);
    }
  } finally {
    running.delete(tableId);
    if (queue.length > 0) void processQueue(tableId);
  }
}
