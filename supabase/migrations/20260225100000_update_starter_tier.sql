-- Rename "Starter" tier and reduce quota from 8 to 4 lessons/month
UPDATE membership_tiers
SET name = 'Monthly Lesson Membership',
    slug = 'monthly-lesson-membership',
    monthly_booking_quota = 4,
    updated_at = now()
WHERE slug = 'starter';
