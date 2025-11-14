import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

export function BusinessHours() {
  const hours = [
    { day: "Monday", hours: "7:00 AM - 6:00 PM" },
    { day: "Tuesday", hours: "7:00 AM - 6:00 PM" },
    { day: "Wednesday", hours: "7:00 AM - 6:00 PM" },
    { day: "Thursday", hours: "7:00 AM - 6:00 PM" },
    { day: "Friday", hours: "7:00 AM - 6:00 PM" },
    { day: "Saturday", hours: "8:00 AM - 5:00 PM" },
    { day: "Sunday", hours: "9:00 AM - 3:00 PM" }
  ];

  return (
    <Card className="max-w-md mx-auto" data-testid="card-business-hours">
      <CardHeader className="space-y-0 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary text-primary-foreground">
            <Clock className="w-5 h-5" />
          </div>
          <CardTitle className="text-xl font-serif">Business Hours</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {hours.map((item, index) => (
            <div 
              key={index} 
              className="flex justify-between items-center py-2 border-b border-border last:border-0"
              data-testid={`hours-${item.day.toLowerCase()}`}
            >
              <span className="font-medium text-foreground">{item.day}</span>
              <span className="text-muted-foreground">{item.hours}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
