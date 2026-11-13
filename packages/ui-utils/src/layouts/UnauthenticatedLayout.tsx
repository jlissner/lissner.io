import React from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function UnauthenticatedLayout({
  children,
}: {
  children: React.ReactElement;
}) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
