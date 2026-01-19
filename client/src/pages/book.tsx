import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isSameDay, addDays, startOfDay } from "date-fns";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
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
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
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
      const endAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
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
  }, [selectedServiceId, selectedDate]);

  // Group availabilities by date
  const availabilitiesByDate = useMemo(() => {
    const slots = availabilityQuery.data?.availabilities || [];
    const grouped = new Map<string, AvailabilitySlot[]>();

    slots.forEach((slot) => {
      if (slot.startAt) {
        const dateKey = format(new Date(slot.startAt), "yyyy-MM-dd");
        const existing = grouped.get(dateKey) || [];
        existing.push(slot);
        grouped.set(dateKey, existing);
      }
    });

    return grouped;
  }, [availabilityQuery.data]);

  // Get available dates for the calendar
  const availableDates = useMemo(() => {
    return Array.from(availabilitiesByDate.keys()).map((d) => new Date(d));
  }, [availabilitiesByDate]);

  // Get times for selected date
  const timesForSelectedDate = useMemo(() => {
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return availabilitiesByDate.get(dateKey) || [];
  }, [selectedDate, availabilitiesByDate]);

  // Generate calendar days (2 weeks)
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const today = startOfDay(new Date());
    for (let i = 0; i < 14; i++) {
      days.push(addDays(today, i));
    }
    return days;
  }, []);

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
        message: `Booking confirmed! Reference #${data.bookingId}`,
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

  const selectedService = squareServices.find((s) => s.id === selectedServiceId);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="pt-28 pb-16 px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 mb-4">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Premium Booking</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-semibold">Book Your Service</h1>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              Select a service, pick your preferred date and time, and we'll take care of the rest.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
              {/* Service Selection */}
              <Card className="border-2 border-transparent hover:border-purple-200/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">1</span>
                    Select a Service
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {servicesLoading && <p className="text-sm text-muted-foreground">Loading services...</p>}
                  {!servicesLoading &&
                    squareServices.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => setSelectedServiceId(service.id)}
                        className={`rounded-xl border-2 px-4 py-4 text-left transition-all ${
                          selectedServiceId === service.id
                            ? "border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg shadow-purple-100"
                            : "border-border hover:border-purple-300 hover:shadow-md"
                        }`}
                      >
                        <p className="font-semibold text-lg">{service.title}</p>
                        {service.displayPrice && service.price && (
                          <p className="text-purple-600 font-bold mt-1">Starting at ${Number(service.price).toFixed(2)}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{service.description}</p>
                      </button>
                    ))}
                </CardContent>
              </Card>

              {/* Calendar Date Selection */}
              <Card className="border-2 border-transparent hover:border-purple-200/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">2</span>
                    <Calendar className="w-5 h-5" />
                    Choose a Date
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {availabilityQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-2">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                            {day}
                          </div>
                        ))}
                        {/* Empty cells for alignment */}
                        {Array.from({ length: calendarDays[0]?.getDay() || 0 }).map((_, i) => (
                          <div key={`empty-${i}`} />
                        ))}
                        {calendarDays.map((day) => {
                          const dateKey = format(day, "yyyy-MM-dd");
                          const hasSlots = availabilitiesByDate.has(dateKey);
                          const isSelected = isSameDay(day, selectedDate);
                          const isToday = isSameDay(day, new Date());

                          return (
                            <button
                              key={dateKey}
                              onClick={() => hasSlots && setSelectedDate(day)}
                              disabled={!hasSlots}
                              className={`
                                relative p-3 rounded-xl text-center transition-all
                                ${isSelected
                                  ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200"
                                  : hasSlots
                                    ? "hover:bg-purple-50 hover:shadow-md border border-transparent hover:border-purple-200"
                                    : "text-muted-foreground/40 cursor-not-allowed"
                                }
                                ${isToday && !isSelected ? "ring-2 ring-purple-300" : ""}
                              `}
                            >
                              <div className="text-lg font-semibold">{format(day, "d")}</div>
                              <div className="text-xs mt-0.5">{format(day, "MMM")}</div>
                              {hasSlots && !isSelected && (
                                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-green-500"></div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {availableDates.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          No availability in the next 2 weeks. Please check back later.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Time Selection */}
              <Card className="border-2 border-transparent hover:border-purple-200/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">3</span>
                    <Clock className="w-5 h-5" />
                    Select a Time
                    {selectedDate && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        for {format(selectedDate, "EEEE, MMMM d")}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {timesForSelectedDate.length === 0 ? (
                    <p className="text-center text-muted-foreground py-6">
                      {availabilityQuery.isLoading
                        ? "Loading times..."
                        : "No times available for this date. Please select another date."}
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {timesForSelectedDate.map((slot) => {
                        const startAt = slot.startAt ? new Date(slot.startAt) : null;
                        const timeLabel = startAt ? format(startAt, "h:mm a") : "";
                        const isSelected = selectedSlot?.startAt === slot.startAt;
                        const duration = slot.appointmentSegments[0]?.durationMinutes;

                        return (
                          <button
                            key={slot.startAt}
                            onClick={() => setSelectedSlot(slot)}
                            className={`
                              px-3 py-3 rounded-xl text-center transition-all font-medium
                              ${isSelected
                                ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200"
                                : "border-2 border-border hover:border-purple-300 hover:bg-purple-50 hover:shadow-md"
                              }
                            `}
                          >
                            <div className="text-sm">{timeLabel}</div>
                            {duration && (
                              <div className={`text-xs mt-0.5 ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>
                                {Math.floor(duration / 60)}h {duration % 60}m
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Customer Details & Summary */}
            <div className="space-y-6">
              {/* Booking Summary */}
              {(selectedService || selectedSlot) && (
                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <CardHeader>
                    <CardTitle className="text-lg">Booking Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {selectedService && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service</span>
                        <span className="font-medium">{selectedService.title}</span>
                      </div>
                    )}
                    {selectedSlot?.startAt && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date</span>
                          <span className="font-medium">{format(new Date(selectedSlot.startAt), "EEEE, MMM d")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Time</span>
                          <span className="font-medium">{format(new Date(selectedSlot.startAt), "h:mm a")}</span>
                        </div>
                      </>
                    )}
                    {selectedService?.displayPrice && selectedService?.price && (
                      <div className="flex justify-between pt-2 border-t border-purple-200">
                        <span className="font-semibold">Starting Price</span>
                        <span className="font-bold text-purple-600">${Number(selectedService.price).toFixed(2)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Contact Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">4</span>
                    Your Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer-name">Full Name *</Label>
                    <Input
                      id="customer-name"
                      placeholder="John Smith"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-email">Email *</Label>
                    <Input
                      id="customer-email"
                      type="email"
                      placeholder="john@example.com"
                      value={customerEmail}
                      onChange={(event) => setCustomerEmail(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-phone">Phone</Label>
                    <Input
                      id="customer-phone"
                      placeholder="(555) 123-4567"
                      value={customerPhone}
                      onChange={(event) => setCustomerPhone(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Special Requests</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any special instructions or requests..."
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={3}
                    />
                  </div>

                  {bookingStatus && (
                    <div
                      className={`rounded-xl border px-4 py-3 text-sm ${
                        bookingStatus.success
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-destructive/30 bg-destructive/10 text-destructive"
                      }`}
                    >
                      {bookingStatus.success && <Sparkles className="w-4 h-4 inline mr-2" />}
                      {bookingStatus.message}
                    </div>
                  )}

                  <Button
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all"
                    size="lg"
                    disabled={
                      isSubmitting ||
                      !selectedSlot ||
                      !customerName ||
                      !customerEmail ||
                      !selectedServiceId
                    }
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Booking...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Confirm Booking
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
