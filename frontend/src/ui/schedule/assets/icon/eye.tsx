import * as React from "react"
import { SVGProps } from "react"
const SvgComponent = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    fill="none"
    {...props}
  >
    <path
      fill="#fff"
      fillRule="evenodd"
      d="M1.407 7.625C2.637 4.605 5.173 2.667 8 2.667s5.364 1.938 6.593 4.958c.098.24.098.51 0 .75-1.23 3.02-3.766 4.958-6.593 4.958s-5.364-1.938-6.593-4.958a.996.996 0 0 1 0-.75ZM7.999 12.1c2.28 0 4.37-1.575 5.434-4.1-1.064-2.525-3.154-4.1-5.434-4.1C5.72 3.9 3.63 5.475 2.566 8 3.63 10.524 5.72 12.1 8 12.1Zm0-1.67C6.68 10.43 5.611 9.343 5.611 8c0-1.343 1.07-2.43 2.388-2.43 1.32 0 2.39 1.087 2.39 2.43 0 1.342-1.07 2.43-2.39 2.43Zm0-1.233c.65 0 1.177-.536 1.177-1.197S8.65 6.803 8 6.803c-.65 0-1.177.536-1.177 1.197S7.35 9.197 8 9.197Z"
      clipRule="evenodd"
    />
  </svg>
)
export default SvgComponent
