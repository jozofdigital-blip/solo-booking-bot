-- Clean up test data: delete all appointments and clients
-- This preserves profiles, services, working_hours, and all master settings

DELETE FROM appointments;
DELETE FROM clients;