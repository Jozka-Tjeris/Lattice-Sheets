interface WebsiteIconProps{
  height: number;
  fillColor?: string;
}

export function WebsiteIcon({ height = 30, fillColor = "" }: WebsiteIconProps) {
  return (
    <svg
      width={height * 1.2}
      height={height}
      viewBox="0 0 43 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <path
          id="tile"
          d="
            M5.58555 6.45056
            C5.83087 5.59196 6.61564 5 7.5086 5
            H19.3485
            C20.6773 5 21.6366 6.27181 21.2716 7.54944
            L18.4144 17.5494
            C18.1691 18.408 17.3844 19 16.4914 19
            H4.65146
            C3.3227 19 2.36337 17.7282 2.72841 16.4506
            L5.58555 6.45056
            Z
          "
        />
      </defs>

      {/* Row 1 */}
      <use href="#tile" transform="translate(5 0)" className="fill-stormy-teal"/>

      {/* Row 2 */}
      <use href="#tile" transform="translate(0 16)" className="fill-grey-olive"/>
      <use href="#tile" transform="translate(18 16)" className="fill-tangerine-dream"/>

      {/* Shared styling */}
      <style>
        {`
          use {
            fill: ${fillColor}
          }
        `}
      </style>
    </svg>
  );
}
