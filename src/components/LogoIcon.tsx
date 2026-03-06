import React from "react";

export function LogoIcon({ className = "w-6 h-6", ...props }: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 512 512"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <rect width="512" height="512" rx="112" fill="#FFFFFF" />
            <g strokeLinecap="round" strokeLinejoin="round" fill="none">
                <path d="M 160 376 V 160" stroke="#09090B" strokeWidth="72" />
                <path d="M 160 256 C 160 120, 352 120, 352 256 V 376" stroke="#09090B" strokeWidth="72" />
                <path d="M 240 290 L 205 325 L 240 360" stroke="#A1A1AA" strokeWidth="32" />
                <path d="M 272 290 L 307 325 L 272 360" stroke="#34D399" strokeWidth="32" />
            </g>
        </svg>
    );
}
