export function BaseIcon({ value }: { value: number; }){
    return <div className="flex relative rounded-md relative pointer bg-muted/10 border-1 border-gray-450 bg-white">
            <div className="flex items-center justify-center rounded-sm relative w-23 h-23 min-w-23">
                <div className="flex justify-center items-center flex-none relative bg-[#0d7f78] text-[22px] rounded-xl w-14 h-14">
                    <span className="text-white text-[22px]">Un</span>
                </div>
            </div>
            <div className="flex flex-col flex-auto text-left justify-center mr-2">
                <div className="flex justify-between items-center">
                    <div className="flex flex-auto">
                        <a className="flex-auto flex-grow-none left-align flex items-center" href="/dummy">
                            <h3 className="font-normal">Untitled Base</h3>
                        </a>
                    </div>
                    <div className="flex flex-none z1 items-center ml-half absolute right-0 top-0 mr2 mt2 rounded-big colors-background-raised-surface-hover min-h-[1.75rem]"></div>
                    </div>
                    <div className="flex items-center mt-half">
                        <div className="text-xs font-normal truncate">
                            <div className="flex items-center">
                                <div tabIndex={value} role="button" className="truncate relative z-2">Opened 15 hours ago</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
}
