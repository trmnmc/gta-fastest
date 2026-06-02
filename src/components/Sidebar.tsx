"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Library, CalendarDays, Settings, Pickaxe } from "lucide-react";

const NAV = [
  { href: "/", label: "Library", icon: Library, exact: true },
  { href: "/clips", label: "Clips", icon: Film },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-panel-border bg-panel/60 backdrop-blur">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-creeper-500 text-black">
          <Pickaxe size={20} />
        </span>
        <div className="leading-tight">
          <div className="font-pixel text-[11px] text-creeper-400">CreeperClips</div>
          <div className="text-[11px] text-gray-500">clip your server to fame</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-creeper-700/25 text-creeper-300"
                  : "text-gray-400 hover:bg-panel-soft hover:text-gray-100"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 text-[11px] text-gray-600">
        Self-hosted · single user
      </div>
    </aside>
  );
}
