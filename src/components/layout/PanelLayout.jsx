import React from "react";
import Sidebar from "./Sidebar";

export default function PanelLayout({
  role,
  sidebarOpen,
  setSidebarOpen,
  header,
  children,
  containerClassName = "flex h-screen bg-gray-50",
  contentClassName = "flex-1 flex flex-col",
  mainClassName = "flex-1 overflow-auto p-6",
}) {
  return (
    <div className={containerClassName}>
      <Sidebar role={role} open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className={contentClassName}>
        {header}
        <main className={mainClassName}>{children}</main>
      </div>
    </div>
  );
}
