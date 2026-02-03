import type { ReactElement } from "react";

interface ThemeSelectorButtonProps{
  size: number;
  fillValue: string;
  onPress: () => void;
  children?: ReactElement;
}

export function ThemeSelectorButton({ size, fillValue, onPress, children}: ThemeSelectorButtonProps){
  return (
    <div 
      className={`flex justify-center items-center rounded ${fillValue} m-1 cursor-pointer shadow-lg hover:shadow-xl`}
      style={{ width: size, height: size }}
      onClick={onPress}
    >
      {children}
    </div>
  )
}