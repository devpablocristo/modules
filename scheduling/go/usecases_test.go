package scheduling

import (
	"testing"
	"time"

	"github.com/google/uuid"

	schedulingdomain "github.com/devpablocristo/modules/scheduling/go/domain"
)

func TestCanTransitionBooking(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		from schedulingdomain.BookingStatus
		to   schedulingdomain.BookingStatus
		want bool
	}{
		{name: "hold to confirmed", from: schedulingdomain.BookingStatusHold, to: schedulingdomain.BookingStatusConfirmed, want: true},
		{name: "pending to completed invalid", from: schedulingdomain.BookingStatusPendingConfirmation, to: schedulingdomain.BookingStatusCompleted, want: false},
		{name: "confirmed to checked_in", from: schedulingdomain.BookingStatusConfirmed, to: schedulingdomain.BookingStatusCheckedIn, want: true},
		{name: "completed to confirmed invalid", from: schedulingdomain.BookingStatusCompleted, to: schedulingdomain.BookingStatusConfirmed, want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := canTransitionBooking(tt.from, tt.to); got != tt.want {
				t.Fatalf("canTransitionBooking(%q, %q) = %v, want %v", tt.from, tt.to, got, tt.want)
			}
		})
	}
}

func TestCanTransitionQueueTicket(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		from schedulingdomain.QueueTicketStatus
		to   schedulingdomain.QueueTicketStatus
		want bool
	}{
		{name: "waiting to called", from: schedulingdomain.QueueTicketStatusWaiting, to: schedulingdomain.QueueTicketStatusCalled, want: true},
		{name: "called to completed invalid", from: schedulingdomain.QueueTicketStatusCalled, to: schedulingdomain.QueueTicketStatusCompleted, want: false},
		{name: "serving to completed", from: schedulingdomain.QueueTicketStatusServing, to: schedulingdomain.QueueTicketStatusCompleted, want: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := canTransitionQueueTicket(tt.from, tt.to); got != tt.want {
				t.Fatalf("canTransitionQueueTicket(%q, %q) = %v, want %v", tt.from, tt.to, got, tt.want)
			}
		})
	}
}

func TestGenerateSlotsForResourceAppliesIntersectionAndBlocks(t *testing.T) {
	t.Parallel()

	loc, err := time.LoadLocation("America/Argentina/Tucuman")
	if err != nil {
		t.Fatalf("load location: %v", err)
	}
	day := time.Date(2026, 4, 6, 0, 0, 0, 0, loc) // Monday
	branch := schedulingdomain.Branch{ID: uuid.New(), Timezone: "America/Argentina/Tucuman"}
	resource := schedulingdomain.Resource{ID: uuid.New(), Name: "Profesional Demo"}
	service := schedulingdomain.Service{
		ID:                     uuid.New(),
		Code:                   "consulta",
		DefaultDurationMinutes: 30,
		BufferBeforeMinutes:    0,
		BufferAfterMinutes:     0,
		SlotGranularityMinutes: 30,
	}
	rules := []schedulingdomain.AvailabilityRule{
		{
			Kind:                   schedulingdomain.AvailabilityRuleKindBranch,
			Weekday:                1,
			StartTime:              "09:00",
			EndTime:                "12:00",
			SlotGranularityMinutes: intPtr(30),
		},
		{
			Kind:                   schedulingdomain.AvailabilityRuleKindResource,
			Weekday:                1,
			StartTime:              "10:00",
			EndTime:                "12:00",
			SlotGranularityMinutes: intPtr(30),
		},
	}
	blocked := []schedulingdomain.BlockedRange{
		{
			StartAt: time.Date(2026, 4, 6, 10, 30, 0, 0, loc).UTC(),
			EndAt:   time.Date(2026, 4, 6, 11, 0, 0, 0, loc).UTC(),
		},
	}

	slots := generateSlotsForResource(loc, branch, resource, service, day, rules, blocked)

	if len(slots) != 3 {
		t.Fatalf("expected 3 slots, got %d", len(slots))
	}
	if slots[0].StartAt.In(loc).Format("15:04") != "10:00" {
		t.Fatalf("expected first slot at 10:00, got %s", slots[0].StartAt.In(loc).Format("15:04"))
	}
	if slots[1].StartAt.In(loc).Format("15:04") != "11:00" {
		t.Fatalf("expected second slot at 11:00, got %s", slots[1].StartAt.In(loc).Format("15:04"))
	}
	if slots[2].StartAt.In(loc).Format("15:04") != "11:30" {
		t.Fatalf("expected third slot at 11:30, got %s", slots[2].StartAt.In(loc).Format("15:04"))
	}
}

func intPtr(v int) *int { return &v }
