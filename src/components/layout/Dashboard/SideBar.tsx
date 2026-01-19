"use client"

import { api as trpc } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function Sidebar() {
    const router = useRouter();
    const utils = trpc.useUtils();
    const [creating, setCreating] = useState(false);

    const createBaseMutation = trpc.base.createBase.useMutation({
        onSuccess: (newBase) => {
        utils.base.listBases.invalidate(); // Refresh the base list
        router.push(`/base/${newBase.id}`); // Redirect to the new base
        },
        onError: (err) => {
        console.error("Failed to create base:", err);
        setCreating(false);
        },
    });

    const handleCreateBase = () => {
        setCreating(true);
        createBaseMutation.mutate({ name: "Untitled Base" });
    };

    return <aside className="flex flex-col w-75 border-r p-4 gap-2 h-full">
        <div className="min-h-145">
            {/* <!-- Home link --> */}
            <a href="" className="flex items-center bg-gray-100 hover:bg-gray-200 mb-[4px] rounded px-[6px] py-[6px] text-decoration-none">
                <svg width="20" height="20" viewBox="0 0 16 16" className="flex-none icon">
                    <use fill="currentColor" href="/assets/icon_definitions.svg#House"></use>
                </svg>
                <h4 className="font-semibold text-[16px] text-gray-900 leading-[24px] ml-[6px] truncate">Home</h4>
            </a>

            {/* <!-- Starred --> */}
            <div className="flex items-center justify-between rounded hover:bg-gray-100 mb-[4px]">
                <a href="" className="w-full flex items-center px-[6px] py-[6px]">
                    <svg width="20" height="20" viewBox="0 0 16 16" className="flex-none icon">
                        <use fill="currentColor" href="/assets/icon_definitions.svg#Star"></use>
                    </svg>
                    <div className="ml-[6px] truncate">Starred</div>
                </a>
                <button className="flex p-[4px] focus:outline-none rounded hover:bg-gray-200">
                    <svg width="16" height="16" viewBox="0 0 16 16" className="flex-none animate text-gray-700" style={{
                      transform: "rotate(-90deg)",
                      transformOrigin: "center",
                      transformBox: "fill-box",
                      flexShrink: 0
                    }}>
                      <use fill="currentColor" href="/assets/icon_definitions.svg#ChevronDown"></use>
                    </svg>
                </button>
            </div>

            {/* <!-- Shared --> */}
            <a href="" className="flex items-center hover:bg-gray-100 mb-[4px] rounded px-[6px] py-[6px]">
                <svg width="20" height="20" viewBox="0 0 16 16" className="flex-none icon">
                    <use fill="currentColor" href="/assets/icon_definitions.svg#Share"></use>
                </svg>
                <h4 className="text-[16px] text-gray-900 leading-[24px] ml-[6px] truncate">Shared</h4>
            </a>


            {/* <!-- Workspaces --> */}
            <div className="flex items-center justify-between rounded hover:bg-gray-100 mb-[8px]">
                <a href="" className="w-full flex items-center px-[6px] py-[6px] justify-between">
                    <div className="flex items-center">
                        <svg width="20" height="20" viewBox="0 0 16 16" className="flex-none mr-[4px]">
                            <use fill="currentColor" href="/assets/icon_definitions.svg#UsersThree"></use>
                        </svg>
                        Workspaces
                        </div>
                        <button className="flex p-[4px] rounded hover:bg-gray-200">
                        <svg width="16" height="16" viewBox="0 0 16 16" className="flex-none text-gray-700">
                            <use fill="currentColor" href="/assets/icon_definitions.svg#Plus"></use>
                        </svg>
                    </button>
                </a>
                <div tabIndex={0} role="button" className="flex p-[4px] rounded hover:bg-gray-200">
                  <svg width="16" height="16" viewBox="0 0 16 16" className="flex-none animate text-color-default" style={{
                      transform: "rotate(-90deg)",
                      transformOrigin: "center",
                      transformBox: "fill-box",
                      flexShrink: 0
                    }}>
                    <use fill="currentColor" href="/assets/icon_definitions.svg#ChevronDown"></use>
                  </svg>
                </div>
            </div>
        </div>
      
        <div className="border-t my-1"></div>

        <div>
            <a href="" className="w-full flex items-center px-[6px] h-[32px] hover:bg-gray-100 rounded mb-[4px]">
                <svg width="16" height="16" className="flex-none mr-[4px]">
                <use fill="currentColor" href="/assets/icon_definitions.svg#BookOpen"></use>
                </svg>
                Templates and apps
            </a>
            <a href="https://airtable.com/marketplace" className="w-full flex items-center px-[6px] h-[32px] hover:bg-gray-100 rounded mb-[4px]">
                <svg width="16" height="16" className="flex-none mr-[4px]">
                    <use fill="currentColor" href="/assets/icon_definitions.svg#ShoppingBagOpen"></use>
                </svg>
                Marketplace
            </a>
            <a href="" className="w-full flex items-center px-[6px] h-[32px] hover:bg-gray-100 rounded mb-[4px]">
                <svg width="16" height="16" className="flex-none mr-[4px]">
                    <use fill="currentColor" href="/assets/icon_definitions.svg#UploadSimple"></use>
                </svg>
                Import
            </a>
            <div>
                <button
                onClick={handleCreateBase}
                disabled={creating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                <svg width="16" height="16" className="flex-none">
                    <use fill="currentColor" href="/assets/icon_definitions.svg#Plus" />
                </svg>
                {creating ? "Creating…" : "Create Base"}
                </button>
            </div>
        </div>
    </aside>
}
