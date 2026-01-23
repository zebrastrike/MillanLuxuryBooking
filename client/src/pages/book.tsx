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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Sparkles, Home, AlertCircle } from "lucide-react";
import type { ServiceItem, ServicePricingTier } from "@shared/types";

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
  const [selectedPricingTier, setSelectedPricingTier] = useState<string | null>(null);
  const [squareFootage, setSquareFootage] = useState("");
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

  const selectedService = squareServices.find((s) => s.id === selectedServiceId);

  // Parse pricing tiers from service
  const pricingTiers = useMemo((): ServicePricingTier[] => {
    if (!selectedService?.pricingTiers) return [];
    try {
      const tiers = selectedService.pricingTiers as ServicePricingTier[];
      return Array.isArray(tiers) ? tiers : [];
    } catch {
      return [];
    }
  }, [selectedService]);

  // Calculate selected price based on tier or base price
  const selectedPrice = useMemo(() => {
    if (selectedPricingTier && pricingTiers.length > 0) {
      const tier = pricingTiers.find((t) => t.name === selectedPricingTier);
      if (tier) return tier.price;
    }
    return selectedService?.price ? Number(selectedService.price) : null;
  }, [selectedPricingTier, pricingTiers, selectedService]);

  // Calculate deposit amount
  const depositAmount = useMemo(() => {
    if (!selectedService?.requiresDeposit) return null;
    if (selectedService.depositAmount) return Number(selectedService.depositAmount);
    if (selectedPrice && selectedService.depositPercent) {
      return Math.round((selectedPrice * selectedService.depositPercent) / 100);
    }
    // Default: 25% deposit
    if (selectedPrice) return Math.round(selectedPrice * 0.25);
    return null;
  }, [selectedService, selectedPrice]);

  useEffect(() => {
    if (!selectedServiceId && squareServices.length > 0) {
      setSelectedServiceId(squareServices[0].id);
    }
  }, [selectedServiceId, squareServices]);

  // Reset pricing tier when service changes
  useEffect(() => {
    setSelectedPricingTier(null);
  }, [selectedServiceId]);

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

    // Build notes with pricing tier and square footage info
    const noteParts: string[] = [];
    if (selectedPricingTier) {
      noteParts.push(`Size: ${selectedPricingTier}`);
    }
    if (squareFootage) {
      noteParts.push(`Square Footage: ${squareFootage} sq ft`);
    }
    if (notes) {
      noteParts.push(notes);
    }
    const bookingNotes = noteParts.join("\n");

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
          notes: bookingNotes,
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
        message: `Booking confirmed! Reference #${data.bookingId}. ${depositAmount ? `A deposit of $${depositAmount.toFixed(2)} will be collected.` : ""}`,
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
                        <div className="flex items-start justify-between">
                          <p className="font-semibold text-lg">{service.title}</p>
                          {service.requiresDeposit !== false && (
                            <Badge variant="outline" className="text-xs">Deposit Required</Badge>
                          )}
                        </div>
                        {service.displayPrice && service.price && (
                          <p className="text-purple-600 font-bold mt-1">Starting at ${Number(service.price).toFixed(2)}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{service.description}</p>
                      </button>
                    ))}
                </CardContent>
              </Card>

              {/* Pricing Tier Selection (if available) */}
              {pricingTiers.length > 0 && (
                <Card className="border-2 border-transparent hover:border-purple-200/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="w-5 h-5 text-purple-500" />
                      Select Property Size
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {pricingTiers.map((tier) => (
                        <button
                          key={tier.name}
                          onClick={() => setSelectedPricingTier(tier.name)}
                          className={`rounded-xl border-2 px-4 py-4 text-left transition-all ${
                            selectedPricingTier === tier.name
                              ? "border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg shadow-purple-100"
                              : "border-border hover:border-purple-300 hover:shadow-md"
                          }`}
                        >
                          <p className="font-semibold">{tier.name}</p>
                          <p className="text-purple-600 font-bold mt-1">${tier.price.toFixed(2)}</p>
                          {tier.description && (
                            <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Square Footage Input */}
                    <div className="mt-6 pt-4 border-t">
                      <Label htmlFor="square-footage" className="text-sm font-medium">
                        Square Footage (optional)
                      </Label>
                      <Input
                        id="square-footage"
                        type="number"
                        placeholder="e.g., 1500"
                        value={squareFootage}
                        onChange={(e) => setSquareFootage(e.target.value)}
                        className="mt-2 max-w-xs"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Helps us prepare for your service
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Square Footage for services without pricing tiers */}
              {pricingTiers.length === 0 && selectedService && (
                <Card className="border-2 border-transparent hover:border-purple-200/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="w-5 h-5 text-purple-500" />
                      Property Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <Label htmlFor="square-footage-alt" className="text-sm font-medium">
                        Square Footage (optional)
                      </Label>
                      <Input
                        id="square-footage-alt"
                        type="number"
                        placeholder="e.g., 1500"
                        value={squareFootage}
                        onChange={(e) => setSquareFootage(e.target.value)}
                        className="mt-2 max-w-xs"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Helps us prepare for your service
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

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
                    {selectedPricingTier && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Property Size</span>
                        <span className="font-medium">{selectedPricingTier}</span>
                      </div>
                    )}
                    {squareFootage && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Square Footage</span>
                        <span className="font-medium">{squareFootage} sq ft</span>
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
                    {selectedPrice && (
                      <>
                        <div className="border-t border-purple-200 my-2" />
                        <div className="flex justify-between">
                          <span className="font-medium">Service Price</span>
                          <span className="font-bold text-purple-600">${selectedPrice.toFixed(2)}</span>
                        </div>
                        {depositAmount && selectedService?.requiresDeposit !== false && (
                          <div className="flex justify-between items-center pt-2 border-t border-purple-200">
                            <div>
                              <span className="font-semibold">Deposit Due</span>
                              <p className="text-xs text-muted-foreground">Due at booking</p>
                            </div>
                            <span className="font-bold text-lg text-purple-600">${depositAmount.toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Deposit Notice */}
              {selectedService?.requiresDeposit !== false && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardContent className="pt-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-900">Deposit Required</p>
                        <p className="text-amber-700 mt-1">
                          A {selectedService?.depositPercent || 25}% deposit is required to confirm your booking.
                          The remaining balance is due on the day of service.
                        </p>
                      </div>
                    </div>
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
                      {bookingStatus.message}
                    </div>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={
                      isSubmitting ||
                      !selectedServiceId ||
                      !selectedSlot ||
                      !customerName.trim() ||
                      !customerEmail.trim()
                    }
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    size="lg"
                  >
                    {isSubmitting ? "Booking..." : depositAmount ? `Confirm Booking • $${depositAmount.toFixed(2)} Deposit` : "Confirm Booking"}
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
