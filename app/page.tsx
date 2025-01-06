'use client';
import Header from "@/components/ui/header";
import RepoList from "@/components/page/RepoList";
import { ThemeProvider } from "@/components/ui/theme-provider";
export default function Home() {
  return (
    <>
     <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
     <Header />
     <RepoList/>
     </ThemeProvider>
    </>
  );
}
