-- Small, idempotent development seed for AutoCare. Run after schema.sql.
DECLARE @customer_id UNIQUEIDENTIFIER = '7B20C675-9B08-4D97-8A96-4FC79EAB8A01';
DECLARE @vehicle_id UNIQUEIDENTIFIER = '3F26AF51-9B4B-4A2A-B1D1-4FC79EAB8A02';
DECLARE @center_id UNIQUEIDENTIFIER = '4C22F062-2D30-411D-9EB2-4FC79EAB8A03';
DECLARE @type_id UNIQUEIDENTIFIER = 'B7F5C11A-4133-463B-A7D5-4FC79EAB8A04';
DECLARE @booking_id UNIQUEIDENTIFIER = 'D3F85D4E-3D98-47E2-8B06-4FC79EAB8A05';

IF NOT EXISTS (SELECT 1 FROM [dbo].[customers] WHERE [id] = @customer_id)
  INSERT INTO [dbo].[customers] ([id], [name], [email], [phone])
  VALUES (@customer_id, N'Ananya Sharma', N'ananya.sharma@example.test', N'+91-98765-43210');

IF NOT EXISTS (SELECT 1 FROM [dbo].[vehicles] WHERE [id] = @vehicle_id)
  INSERT INTO [dbo].[vehicles] ([id], [customer_id], [make], [model], [model_year], [license_plate], [mileage])
  VALUES (@vehicle_id, @customer_id, N'Honda', N'City', 2022, N'KA01AB1234', 18500);

IF NOT EXISTS (SELECT 1 FROM [dbo].[service_centers] WHERE [id] = @center_id)
  INSERT INTO [dbo].[service_centers] ([id], [name], [address], [city], [phone])
  VALUES (@center_id, N'AutoCare Indiranagar', N'100 CMH Road', N'Bengaluru', N'+91-80600-10000');

IF NOT EXISTS (SELECT 1 FROM [dbo].[service_types] WHERE [id] = @type_id)
  INSERT INTO [dbo].[service_types] ([id], [name], [description], [estimated_duration_minutes], [base_price])
  VALUES (@type_id, N'Periodic service', N'Engine oil, filters, and multi-point inspection.', 90, 3499.00);

IF NOT EXISTS (SELECT 1 FROM [dbo].[bookings] WHERE [id] = @booking_id)
  INSERT INTO [dbo].[bookings] ([id], [customer_id], [vehicle_id], [service_center_id], [service_type_id], [scheduled_at], [status], [notes])
  VALUES (@booking_id, @customer_id, @vehicle_id, @center_id, @type_id, '2026-10-15T09:30:00.000', N'confirmed', N'Please inspect the front brakes.');
