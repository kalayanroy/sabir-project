import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useToast } from "./use-toast";

type ThemeVariant = "professional" | "tint" | "vibrant";
type ThemeAppearance = "light" | "dark" | "system";

type ThemeContextType = {
  primaryColor: string;
  variant: ThemeVariant;
  appearance: ThemeAppearance;
  radius: number;
  updateTheme: (updates: Partial<ThemeSettings>) => void;
  resetTheme: () => void;
};

type ThemeSettings = {
  primary: string;
  variant: ThemeVariant;
  appearance: ThemeAppearance;
  radius: number;
};

const defaultTheme: ThemeSettings = {
  primary: "hsl(265, 100%, 46%)",
  variant: "professional",
  appearance: "light",
  radius: 0.5
};

// Predefined color options
export const colorOptions = [
  { name: "Purple", value: "hsl(265, 100%, 46%)" },
  { name: "Blue", value: "hsl(221, 83%, 53%)" },
  { name: "Green", value: "hsl(142, 71%, 45%)" },
  { name: "Red", value: "hsl(0, 84%, 60%)" },
  { name: "Orange", value: "hsl(24, 94%, 50%)" },
  { name: "Pink", value: "hsl(330, 81%, 60%)" },
  { name: "Teal", value: "hsl(168, 76%, 42%)" },
  { name: "Indigo", value: "hsl(245, 58%, 51%)" },
];

export const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);

  // Load theme from localStorage on initial render
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem("userTheme");
      if (storedTheme) {
        setTheme(JSON.parse(storedTheme));
      }
    } catch (error) {
      console.error("Failed to load theme from localStorage:", error);
    }
  }, []);

  // Update the theme.json equivalent in the DOM whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    
    // Update CSS variables for theme
    root.style.setProperty("--theme-primary", theme.primary);
    
    // Update data attributes for other theme properties
    root.setAttribute("data-theme-variant", theme.variant);
    root.setAttribute("data-theme-appearance", theme.appearance);
    root.setAttribute("data-theme-radius", theme.radius.toString());
    
    // Handle system preference for dark mode
    if (theme.appearance === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      root.setAttribute("data-theme", theme.appearance);
    }
    
    // Watch for system preference changes if in system mode
    const handleSystemPreferenceChange = (e: MediaQueryListEvent) => {
      if (theme.appearance === "system") {
        root.setAttribute("data-theme", e.matches ? "dark" : "light");
      }
    };
    
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", handleSystemPreferenceChange);
    
    return () => {
      mediaQuery.removeEventListener("change", handleSystemPreferenceChange);
    };
  }, [theme]);

  const updateTheme = (updates: Partial<ThemeSettings>) => {
    const newTheme = { ...theme, ...updates };
    setTheme(newTheme);
    
    // Save to localStorage
    try {
      localStorage.setItem("userTheme", JSON.stringify(newTheme));
      toast({
        title: "Theme Updated",
        description: "Your theme settings have been saved.",
        variant: "default",
      });
    } catch (error) {
      console.error("Failed to save theme to localStorage:", error);
      toast({
        title: "Theme Update Failed",
        description: "Failed to save your theme settings.",
        variant: "destructive",
      });
    }
  };

  const resetTheme = () => {
    setTheme(defaultTheme);
    localStorage.removeItem("userTheme");
    toast({
      title: "Theme Reset",
      description: "Theme has been reset to default settings.",
      variant: "default",
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        primaryColor: theme.primary,
        variant: theme.variant,
        appearance: theme.appearance,
        radius: theme.radius,
        updateTheme,
        resetTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}