"use client";
import dynamic from "next/dynamic";

const Navbar = dynamic(() => import("./Navbar"), { ssr: false });

export default function NavbarShell() {
  return <Navbar />;
}
