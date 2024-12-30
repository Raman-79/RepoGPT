// Excluded folders
   
    // Excluded folders
    export const excludedFolders = new Set([
      "node_modules",     // Node.js dependencies
      "__pycache__",      // Python cache files
      "venv",             // Python virtual environment
      "dist",             // Distribution folder for built artifacts
      "build",            // Build artifacts for various projects
      "target",           // Java project build output (Maven/Gradle)
      "bin",              // Binary files
      "obj",              // Object files for .NET projects
      "coverage",         // Test coverage reports
      "debug",            // Debug builds
      "release",          // Release builds
      ".idea",            // JetBrains IDE project settings
      ".vscode",          // Visual Studio Code project settings
      "tmp",              // Temporary files
      "deploy",           // Deployment configuration
      ".git",              // Git repository
      ".svn",              // Subversion repository
      ".hg",               // Mercurial repository
      ".cache",            // Cache directories
      ".gradle",           // Gradle build system
      ".maven",            // Maven local repository
      ".npm",              // NPM cache
      ".sass-cache",       // SASS compiler cache
      "bower_components",  // Bower dependencies
      ".next",             // Next.js build output
      ".nuxt",             // Nuxt.js build output
      "vendor"             // Dependencies in PHP/Ruby projects
    ]);
      
    // Excluded files (commonly binary or log files)
    export const excludedFiles = new Set([
      ".log",            // Log files
      "*.bak",            // Backup files
      "*.swp",            // Vim swap files
      "*.swo",            // Vim swap files
      "*.zip",            // Compressed archives
      "*.tar.gz",         // Compressed archives
      "*.tar.bz2",        // Compressed archives
      "*.tar",            // Compressed archives
      "*.exe",            // Windows executable files
      "*.dll",            // Windows dynamic libraries
      "*.so",             // Linux shared object files
      "*.pdb",            // Program database files (Windows)
      "*.pyc",            // Python bytecode files
      "*.pyo",            // Python optimized bytecode files
      "*.class",          // Java bytecode files
      "*.obj",            // Object files (C/C++)
      "*.out",            // Compiler output files
      "*.a",              // Static libraries (C/C++)
      "*.o",              // Object files (C/C++)
      "*.db",             // Database files (SQLite, etc.)
      "*.dat",            // Generic data files
      "*.iml",            // IntelliJ IDEA module files
      "*.sublime-workspace",  // Sublime Text workspace files
      "*.sublime-project",    // Sublime Text project files
      "*.woff",
      "*.ico",
      ".png",
      "*.jpg",
      "*.jpeg",
      "*.mkv",
      "*.mp4",
      "*.mp3",
      "*.min.js",          // Minified JavaScript
      "*.min.css",         // Minified CSS
      "*.map",             // Source map files
      "*.gif",             // GIF images
      "*.ico",             // Icon files
      "*.svg",             // Vector graphics
      "*.pdf",             // PDF documents
      "*.doc",             // Word documents
      "*.docx",            // Word documents
      "*.xls",             // Excel spreadsheets
      "*.xlsx",            // Excel spreadsheets
      "*.ppt",             // PowerPoint presentations
      "*.pptx",            // PowerPoint presentations
      "package-lock.json", // NPM lock file
      "yarn.lock",         // Yarn lock file
      "*.iso",             // Disk images
      "*.bin",             // Binary files
      "*.jar",             // Java archives
      "*.war",             // Web application archives
      "*.ear"             // Enterprise application archives
    ]);
   

 