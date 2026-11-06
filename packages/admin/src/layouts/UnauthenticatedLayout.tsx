import React from "react";

export function UnauthenticatedLayout({
  children,
}: {
  children: React.ReactElement;
}) {
  return (
    <>
      <nav>nav</nav>
      <main>{children}</main>
      <footer>footer</footer>
    </>
  );
}
