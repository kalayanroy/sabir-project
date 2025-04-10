import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDeviceStatus } from "@/hooks/use-device-status";

const unblockRequestSchema = z.object({
  message: z.string()
    .min(30, "Message must be at least 30 characters long")
    .max(500, "Message cannot exceed 500 characters"),
});

type UnblockRequestValues = z.infer<typeof unblockRequestSchema>;

export function UnblockRequestForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { deviceStatus, submitUnblockRequestMutation, deviceId } = useDeviceStatus();

  const form = useForm<UnblockRequestValues>({
    resolver: zodResolver(unblockRequestSchema),
    defaultValues: {
      message: "",
    },
  });

  // Handle form submission
  const onSubmit = (values: UnblockRequestValues) => {
    if (!deviceId) {
      form.setError("message", { 
        type: "manual", 
        message: "Device ID not available. Please refresh the page or try again later."
      });
      return;
    }

    submitUnblockRequestMutation.mutate({
      deviceId,
      message: values.message
    }, {
      onSuccess: () => {
        setIsSubmitted(true);
        form.reset();
      }
    });
  };

  // If request already sent, show confirmation
  if (deviceStatus?.unblockRequestSent || isSubmitted) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Request Submitted</CardTitle>
          <CardDescription>
            Your unblock request has been sent to the administrator
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-primary/10 border-primary/20 text-primary">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please wait for an administrator to review your request. This may take some time.
              You will be able to register once your device is unblocked.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Device Blocked</CardTitle>
        <CardDescription>
          Your device has been blocked due to multiple registration attempts.
          Please submit a request to unblock your device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submitUnblockRequestMutation.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {submitUnblockRequestMutation.error.message}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unblock Request Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please explain why you need your device unblocked and provide any relevant information to help the administrator verify your identity."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="text-sm text-muted-foreground">
              <p>Your message should include:</p>
              <ul className="list-disc ml-5 mt-1">
                <li>The reason for multiple registration attempts</li>
                <li>Information to verify your identity</li>
                <li>Any other relevant details</li>
              </ul>
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={form.handleSubmit(onSubmit)}
          disabled={submitUnblockRequestMutation.isPending}
        >
          {submitUnblockRequestMutation.isPending ? "Submitting..." : "Submit Request"}
        </Button>
      </CardFooter>
    </Card>
  );
}