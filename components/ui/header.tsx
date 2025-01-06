import React, { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { signIn, signOut, useSession } from "next-auth/react";
import { Search, Github, LogOut, Sun, Moon } from "lucide-react";
import Image from "next/image";
import { Toggle } from "./toggle";

const Header: React.FC = () => {
  const { data: session } = useSession();
  const [theme,setTheme] = useState('dark');
  return (  
    <header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/App Name */}
          <div className="flex-shrink-0">
            <h1 className="text-xl font-semibold text-blue-400">DevSpace</h1>
          </div>
          <div>
            <Toggle
              variant="outline"
              pressed={theme === "dark"}
              onPressedChange={() =>
                setTheme(theme === "dark" ? "light" : "dark")
              }
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Toggle>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl mx-8">
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-500" />
              </div>
              <Input
                type="text"
                placeholder="Search repositories..."
                className="w-full pl-10 py-1.5 bg-[#010409] border-gray-800 text-gray-300 placeholder-gray-500 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}

            {session ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  {session.user?.image && (
                    <div className="relative w-8 h-8 rounded-full overflow-hidden">
                      <Image
                        src={session.user.image}
                        alt="Profile"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-200">
                    {session.user?.name?.split(" ")[0]}
                  </span>
                </div>
                <Button
                  onClick={() => signOut()}
                  variant="ghost"
                  className="text-gray-400 hover:text-gray-200"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => signIn("github")}
                className="flex items-center space-x-2 bg-[#238636] hover:bg-[#2ea043] text-white border-0 px-4 py-1.5 h-auto font-semibold text-sm"
              >
                <Github className="w-4 h-4 mr-2" />
                Sign in with GitHub
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
