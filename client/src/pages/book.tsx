import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ServiceItem } from "@shared/types";

type AvailabilitySlot = {
  startAt: string | null;
  locationId: string;
  appointmentSegments: {
    teamMemberId: string;
    serviceVariationId: string;
    serviceVariationVersion: string;
    durationMinutes?: number | null;
  }[];
};

type AvailabilityResponse = {
  serviceId: number;
  serviceVariationId: string;
  serviceVariationVersion: string;
  availabilities: AvailabilitySlot[];
};

export default function BookingPage() {
  const queryParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialServiceId = Number(queryParams.get("serviceId"));

  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    Number.isFinite(initialServiceId) ? initialServiceId : null,
  );
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingStatus, setBookingStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: services = [], isLoading: servicesLoading } = useQuery<ServiceItem[]>({
    queryKey: ["/api/services"],
  });

  const squareServices = services.filter((service) => Boolean(service.squareServiceId));

  useEffect(() => {
    if (!selectedServiceId && squareServices.length > 0) {
      setSelectedServiceId(squareServices[0].id);
    }
  }, [selectedServiceId, squareServices]);

  const availabilityQuery = useQuery<AvailabilityResponse>({
    queryKey: ["/api/bookings/availability", selectedServiceId],
    enabled: Boolean(selectedServiceId),
    queryFn: async () => {
      const startAt = new Date().toISOString();
      const endAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const response = await fetch(
        `/api/bookings/availability?serviceId=${selectedServiceId}&startAt=${encodeURIComponent(
          startAt,
        )}&endAt=${encodeURIComponent(endAt)}`,
      );
      if (!response.ok) {
        throw new Error("Failed to load availability");
      }
      return response.json();
    },
  });

  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedServiceId]);

  const handleSubmit = async () => {
    if (!selectedServiceId || !selectedSlot?.startAt || !selectedSlot.appointmentSegments.length) {
      return;
    }

    const segment = selectedSlot.appointmentSegments[0];

    setIsSubmitting(true);
    setBookingStatus(null);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          notes,
          serviceId: selectedServiceId,
          startAt: selectedSlot.startAt,
          teamMemberId: segment.teamMemberId,
          serviceVariationId: segment.serviceVariationId,
          serviceVariationVersion: segment.serviceVariationVersion,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Booking failed");
      }

      setBookingStatus({
        success: true,
        message: `Booking confirmed. Reference #${data.bookingId}`,
      });
    } catch (error) {
      setBookingStatus({
        success: false,
        message: error instanceof Error ? error.message : "Booking failed",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="pt-28 pb-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-serif font-semibold">Book a Service</h1>
            <p className="text-muted-foreground mt-2">
              Select a service, choose a time, and confirm your appointment.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Select a Service</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {servicesLoading && <p className="text-sm text-muted-foreground">Loading services...</p>}
                  {!servicesLoading &&
                    squareServices.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => setSelectedServiceId(service.id)}
                        className={`rounded-xl border px-4 py-3 text-left transition-all ${
                          selectedServiceId === service.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/60"
                        }`}
                      >
                        <p className="font-medium">{service.title}</p>
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                      </button>
                    ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Available Times</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {availabilityQuery.isLoading && (
                    <p className="text-sm text-muted-foreground">Loading availability...</p>
                  )}
                  {availabilityQuery.error && (
                    <p className="text-sm text-destructive">Unable to load availability.</p>
                  )}
                  {!availabilityQuery.isLoading && availabilityQuery.data?.availabilities?.length === 0 && (
                    <p className="text-sm text-muted-foreground">No openings in the next 7 days.</p>
                  )}
                  {availabilityQuery.data?.availabilities?.map((slot) => {
                    const startAt = slot.startAt ? new Date(slot.startAt) : null;
                    const label = startAt ? format(startAt, "MMM d, h:mm a") : "Time unavailable";
                    const isSelected = selectedSlot?.startAt === slot.startAt;
                    return (
                      <button
                        key={`${slot.startAt}-${slot.locationId}`}
                        onClick={() => setSelectedSlot(slot)}
                        className={`w-full rounded-lg border px-4 py-2 text-left text-sm transition ${
                          isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Your Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-name">Full Name</Label>
                  <Input
                    id="customer-name"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-email">Email</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-phone">Phone</Label>
                  <Input
                    id="customer-phone"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={4}
                  />
                </div>
                {bookingStatus && (
                  <div
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      bookingStatus.success
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-destructive/30 bg-destructive/10 text-destructive"
                    }`}
                  >
                    {bookingStatus.message}
                  </div>
                )}
                <Button
                  className="w-full"
                  disabled={
                    isSubmitting ||
                    !selectedSlot ||
                    !customerName ||
                    !customerEmail ||
                    !selectedServiceId
                  }
                  onClick={handleSubmit}
                >
                  {isSubmitting ? "Booking..." : "Confirm Booking"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
