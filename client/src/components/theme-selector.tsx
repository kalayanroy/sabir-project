import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme, colorOptions } from "@/hooks/use-theme";
import { Check, Moon, Paintbrush, Palette, RotateCcw, Sun, SunMoon } from "lucide-react";
import { useState } from "react";

export default function ThemeSelector() {
  const { primaryColor, variant, appearance, radius, updateTheme, resetTheme } = useTheme();
  const [selectedColor, setSelectedColor] = useState(primaryColor);
  const [selectedVariant, setSelectedVariant] = useState<"professional" | "tint" | "vibrant">(variant);
  const [selectedAppearance, setSelectedAppearance] = useState<"light" | "dark" | "system">(appearance);
  const [selectedRadius, setSelectedRadius] = useState(radius);

  const handleApplyTheme = () => {
    updateTheme({
      primary: selectedColor,
      variant: selectedVariant,
      appearance: selectedAppearance,
      radius: selectedRadius
    });
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Palette className="h-5 w-5 mr-2 text-primary" />
          Theme Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="colors" className="flex items-center">
              <Paintbrush className="h-4 w-4 mr-2" />
              <span>Colors</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center">
              <SunMoon className="h-4 w-4 mr-2" />
              <span>Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="style" className="flex items-center">
              <Palette className="h-4 w-4 mr-2" />
              <span>Style</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Color Selector */}
          <TabsContent value="colors" className="mt-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Primary Color</label>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {colorOptions.map((color) => (
                    <div
                      key={color.value}
                      className={`w-full aspect-square rounded-md cursor-pointer flex items-center justify-center transition-all ${
                        selectedColor === color.value ? 'ring-2 ring-primary ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setSelectedColor(color.value)}
                    >
                      {selectedColor === color.value && (
                        <Check className="h-5 w-5 text-white drop-shadow-sm" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="pt-2">
                <label className="text-sm font-medium mb-3 block">Preview</label>
                <div className="space-y-3">
                  <div
                    className="h-14 rounded-md w-full flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: selectedColor }}
                  >
                    Primary Button
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-8 w-8 rounded-full"
                      style={{ backgroundColor: selectedColor }}
                    ></div>
                    <div className="flex-1">
                      <div className="h-2 rounded-full w-full" style={{ backgroundColor: selectedColor, opacity: 0.7 }}></div>
                      <div className="h-2 rounded-full w-2/3 mt-2" style={{ backgroundColor: selectedColor, opacity: 0.5 }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Appearance Selector */}
          <TabsContent value="appearance" className="mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div
                  className={`border rounded-md p-4 cursor-pointer transition-all ${
                    selectedAppearance === 'light' ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                  onClick={() => setSelectedAppearance("light")}
                >
                  <div className="flex justify-center mb-3">
                    <Sun className="h-8 w-8 text-amber-500" />
                  </div>
                  <p className="text-center text-sm font-medium">Light</p>
                </div>
                
                <div
                  className={`border rounded-md p-4 cursor-pointer transition-all ${
                    selectedAppearance === 'dark' ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                  onClick={() => setSelectedAppearance("dark")}
                >
                  <div className="flex justify-center mb-3">
                    <Moon className="h-8 w-8 text-indigo-400" />
                  </div>
                  <p className="text-center text-sm font-medium">Dark</p>
                </div>
                
                <div
                  className={`border rounded-md p-4 cursor-pointer transition-all ${
                    selectedAppearance === 'system' ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                  onClick={() => setSelectedAppearance("system")}
                >
                  <div className="flex justify-center mb-3">
                    <SunMoon className="h-8 w-8 text-blue-500" />
                  </div>
                  <p className="text-center text-sm font-medium">System</p>
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-sm text-muted-foreground">
                  {selectedAppearance === 'light' && 'Light mode uses a bright color scheme that works well during daytime.'}
                  {selectedAppearance === 'dark' && 'Dark mode reduces eye strain in low-light environments and saves battery on OLED screens.'}
                  {selectedAppearance === 'system' && 'System setting automatically switches between light and dark based on your device preferences.'}
                </p>
              </div>
            </div>
          </TabsContent>
          
          {/* Style Selector */}
          <TabsContent value="style" className="mt-4">
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">UI Variant</label>
                <div className="grid grid-cols-3 gap-2">
                  <div
                    className={`border rounded-md p-3 cursor-pointer transition-all ${
                      selectedVariant === 'professional' ? 'ring-2 ring-primary ring-offset-2' : ''
                    }`}
                    onClick={() => setSelectedVariant("professional")}
                  >
                    <p className="text-center text-sm font-medium">Professional</p>
                  </div>
                  
                  <div
                    className={`border rounded-md p-3 cursor-pointer transition-all ${
                      selectedVariant === 'tint' ? 'ring-2 ring-primary ring-offset-2' : ''
                    }`}
                    onClick={() => setSelectedVariant("tint")}
                  >
                    <p className="text-center text-sm font-medium">Tint</p>
                  </div>
                  
                  <div
                    className={`border rounded-md p-3 cursor-pointer transition-all ${
                      selectedVariant === 'vibrant' ? 'ring-2 ring-primary ring-offset-2' : ''
                    }`}
                    onClick={() => setSelectedVariant("vibrant")}
                  >
                    <p className="text-center text-sm font-medium">Vibrant</p>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium block">Border Radius</label>
                  <span className="text-sm text-muted-foreground">{selectedRadius}px</span>
                </div>
                <Slider 
                  defaultValue={[selectedRadius]} 
                  max={1.5} 
                  min={0} 
                  step={0.1}
                  onValueChange={(value) => setSelectedRadius(value[0])}
                />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-muted-foreground">Square</span>
                  <span className="text-xs text-muted-foreground">Rounded</span>
                </div>
              </div>
              
              <div className="pt-2">
                <div className="flex flex-col items-center justify-center space-y-2 border rounded-md p-4 bg-muted/50">
                  <div 
                    className="w-32 h-8 flex items-center justify-center text-white text-sm"
                    style={{ 
                      backgroundColor: selectedColor, 
                      borderRadius: `${selectedRadius * 8}px`,
                    }}
                  >
                    Button
                  </div>
                  <div
                    className="w-32 h-8 border-2 flex items-center justify-center text-sm"
                    style={{ 
                      borderColor: selectedColor, 
                      borderRadius: `${selectedRadius * 8}px`,
                      color: selectedColor
                    }}
                  >
                    Outline
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-between pt-4 border-t">
          <Button 
            variant="outline" 
            size="sm"
            onClick={resetTheme}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button 
            size="sm"
            onClick={handleApplyTheme}
          >
            <Check className="h-4 w-4 mr-2" />
            Apply Theme
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}