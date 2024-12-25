
export const Spinner = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
    const sizes = {
      sm: "h-4 w-4 border-2",
      md: "h-6 w-6 border-4",
      lg: "h-8 w-8 border-4",
    };
  
    return (
      <div
        className={`animate-spin rounded-full border-t-2 border-primary ${sizes[size]}`}
        role="status"
      />
    );
  };
  