import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { 
  HelpCircle, 
  Shield, 
  Key, 
  Smartphone, 
  MapPin, 
  AlertTriangle,
  Lock,
  Unlock,
  User,
  Info,
  ChevronRight,
  ArrowRight,
  Fingerprint
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function HelpPage() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Determine if the user is an admin
  const isAdmin = user && (user.username === "admin" || user.username === "admin1");

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <Lock className="h-6 w-6 mr-2" />
            <h1 className="text-xl font-medium">SecureLogin</h1>
          </div>
          <div className="flex items-center">
            <div className="hidden md:block mr-4">
              <span className="text-sm">{user.email}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-white/20" 
              asChild
            >
              <Link href="/">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex flex-1">
        {/* Content Area */}
        <div className="flex-1 p-6 bg-background">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center mb-6">
              <HelpCircle className="h-8 w-8 text-primary mr-3" />
              <h2 className="text-3xl font-medium">Help & Support</h2>
            </div>
            
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-2xl">Getting Started</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <h3 className="text-lg font-medium mb-2 flex items-center">
                      <Fingerprint className="h-5 w-5 mr-2 text-primary" />
                      About SecureLogin
                    </h3>
                    <p className="mb-3">
                      SecureLogin is a secure authentication system that ties user accounts to specific devices. 
                      This approach provides enhanced security by ensuring that only authorized devices can access your account.
                    </p>
                    <div className="flex items-start mt-4">
                      <ArrowRight className="h-5 w-5 text-primary mt-0.5 mr-2 flex-shrink-0" />
                      <p className="text-sm">
                        Your account is bound to the device you registered with, meaning you can only log in from that specific device. 
                        This adds an extra layer of security beyond just password protection.
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <h3 className="text-xl font-medium mt-6">Frequently Asked Questions</h3>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger className="text-base font-medium">
                        Why is my account bound to a specific device?
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        <p className="mb-2">
                          Device binding adds an extra layer of security to your account. By tying your account to a specific device, 
                          even if someone obtains your password, they won't be able to access your account unless they have your physical device.
                        </p>
                        <p>
                          This security measure is particularly important for applications handling sensitive information or requiring 
                          high levels of authentication assurance.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-2">
                      <AccordionTrigger className="text-base font-medium">
                        What happens if I get locked out of my device?
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        <p className="mb-2">
                          If you lose access to your registered device, you'll need to submit an unblock request to the system administrator.
                        </p>
                        <p className="mb-2">
                          The administrator will review your request and may require additional verification before approving access from a new device.
                        </p>
                        <p>
                          This process ensures that only legitimate users can regain access to their accounts.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-3">
                      <AccordionTrigger className="text-base font-medium">
                        Why am I experiencing temporary lockouts?
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        <p className="mb-2">
                          The system implements progressive timeout penalties for failed login attempts as a security measure against brute force attacks.
                        </p>
                        <ul className="list-disc pl-5 space-y-1 mb-2">
                          <li>After 3 failed attempts: 5-minute lockout</li>
                          <li>After 5 failed attempts: 15-minute lockout</li>
                          <li>After 6 failed attempts: 24-hour lockout</li>
                        </ul>
                        <p>
                          These temporary lockouts help protect your account from unauthorized access attempts.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-4">
                      <AccordionTrigger className="text-base font-medium">
                        Why does the system track my location?
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        <p className="mb-2">
                          Location tracking is used as an additional security measure. By recording the locations of login and logout events, 
                          the system can detect potentially suspicious access patterns.
                        </p>
                        <p className="mb-2">
                          This information helps administrators identify unauthorized access attempts and provides you with visibility 
                          into your account activity.
                        </p>
                        <p>
                          You can view your login history in the Security Settings section under the "Login Activity" tab.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-5">
                      <AccordionTrigger className="text-base font-medium">
                        How do I update my account information?
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        <p className="mb-2">
                          You can update your profile information by navigating to the Profile page from the sidebar or dashboard.
                        </p>
                        <p>
                          Here you can modify your email address and other personal information. Note that some changes may require 
                          re-verification for security purposes.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </CardContent>
            </Card>
            
            {/* Security Tips */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-2xl">Security Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center mb-3">
                      <Key className="h-5 w-5 text-amber-500 mr-2" />
                      <h3 className="font-medium">Strong Passwords</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Use complex passwords with a mix of letters, numbers, and symbols. Avoid using the same password across multiple sites.
                    </p>
                  </div>
                  
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center mb-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                      <h3 className="font-medium">Watch for Phishing</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Be cautious of emails or messages asking for your credentials. Always verify the sender and never click suspicious links.
                    </p>
                  </div>
                  
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center mb-3">
                      <Lock className="h-5 w-5 text-amber-500 mr-2" />
                      <h3 className="font-medium">Secure Your Device</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Keep your device's operating system and applications updated. Use anti-virus software and enable a screen lock.
                    </p>
                  </div>
                  
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center mb-3">
                      <User className="h-5 w-5 text-amber-500 mr-2" />
                      <h3 className="font-medium">Regular Monitoring</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Regularly check your login history for any suspicious activity. Report unauthorized access attempts immediately.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Admin Section - Only visible to admin users */}
            {isAdmin && (
              <Card className="mb-6 border border-blue-200">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center">
                    <Shield className="h-6 w-6 text-blue-500 mr-2" />
                    Administrator Help
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                      <h4 className="font-medium mb-2 text-blue-800">Device Management</h4>
                      <p className="text-sm text-blue-700 mb-2">
                        As an administrator, you can manage blocked devices and review unblock requests through the Device Manager.
                      </p>
                      <ul className="list-disc pl-5 text-sm text-blue-700 mb-3">
                        <li>View all blocked devices</li>
                        <li>Review and approve/reject unblock requests</li>
                        <li>Manually unblock devices when needed</li>
                      </ul>
                      <Button 
                        variant="outline" 
                        className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
                        asChild
                      >
                        <Link href="/admin" className="flex items-center">
                          Go to Device Manager
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                      <h4 className="font-medium mb-2 text-blue-800">Location Tracking</h4>
                      <p className="text-sm text-blue-700 mb-2">
                        The Location Manager allows you to track and monitor user login and logout locations.
                      </p>
                      <ul className="list-disc pl-5 text-sm text-blue-700 mb-3">
                        <li>View all login/logout events with location data</li>
                        <li>Filter events by user, location, or time</li>
                        <li>Identify suspicious login patterns</li>
                      </ul>
                      <Button 
                        variant="outline" 
                        className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
                        asChild
                      >
                        <Link href="/location-manager" className="flex items-center">
                          Go to Location Manager
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                      <h4 className="font-medium mb-2 text-blue-800">Admin Privileges</h4>
                      <p className="text-sm text-blue-700 mb-2">
                        As an administrator, you have the following special privileges:
                      </p>
                      <ul className="list-disc pl-5 text-sm text-blue-700">
                        <li>Bypass device binding - you can log in from any device</li>
                        <li>Manage all user devices and security settings</li>
                        <li>Access location data for all users</li>
                        <li>Approve or reject device unblock requests</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Need More Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 rounded-lg bg-muted">
                  <div className="text-center md:text-left">
                    <h3 className="text-lg font-medium mb-2">Contact Support</h3>
                    <p className="text-muted-foreground">
                      If you have additional questions or need assistance, our support team is here to help.
                    </p>
                  </div>
                  <Button className="min-w-[150px]">
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}