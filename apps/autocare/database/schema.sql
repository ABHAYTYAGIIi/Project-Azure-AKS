-- AutoCare Azure SQL / SQL Server schema. Run this once against an empty database.
CREATE TABLE [dbo].[customers] (
  [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_customers] PRIMARY KEY DEFAULT NEWID(),
  [name] NVARCHAR(160) NOT NULL,
  [email] NVARCHAR(320) NOT NULL,
  [phone] NVARCHAR(50) NOT NULL,
  [created_at] DATETIME2(3) NOT NULL CONSTRAINT [DF_customers_created_at] DEFAULT SYSUTCDATETIME(),
  [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [DF_customers_updated_at] DEFAULT SYSUTCDATETIME(),
  CONSTRAINT [UQ_customers_email] UNIQUE ([email])
);

CREATE TABLE [dbo].[service_centers] (
  [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_service_centers] PRIMARY KEY DEFAULT NEWID(),
  [name] NVARCHAR(160) NOT NULL,
  [address] NVARCHAR(300) NOT NULL,
  [city] NVARCHAR(100) NOT NULL,
  [phone] NVARCHAR(50) NOT NULL,
  [created_at] DATETIME2(3) NOT NULL CONSTRAINT [DF_service_centers_created_at] DEFAULT SYSUTCDATETIME(),
  [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [DF_service_centers_updated_at] DEFAULT SYSUTCDATETIME(),
  CONSTRAINT [UQ_service_centers_name_city] UNIQUE ([name], [city])
);

CREATE TABLE [dbo].[service_types] (
  [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_service_types] PRIMARY KEY DEFAULT NEWID(),
  [name] NVARCHAR(160) NOT NULL,
  [description] NVARCHAR(500) NOT NULL,
  [estimated_duration_minutes] INT NOT NULL,
  [base_price] DECIMAL(10, 2) NOT NULL,
  [created_at] DATETIME2(3) NOT NULL CONSTRAINT [DF_service_types_created_at] DEFAULT SYSUTCDATETIME(),
  [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [DF_service_types_updated_at] DEFAULT SYSUTCDATETIME(),
  CONSTRAINT [UQ_service_types_name] UNIQUE ([name]),
  CONSTRAINT [CK_service_types_duration] CHECK ([estimated_duration_minutes] > 0),
  CONSTRAINT [CK_service_types_base_price] CHECK ([base_price] >= 0)
);

CREATE TABLE [dbo].[vehicles] (
  [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_vehicles] PRIMARY KEY DEFAULT NEWID(),
  [customer_id] UNIQUEIDENTIFIER NOT NULL,
  [make] NVARCHAR(80) NOT NULL,
  [model] NVARCHAR(80) NOT NULL,
  [model_year] SMALLINT NOT NULL,
  [license_plate] NVARCHAR(30) NOT NULL,
  [mileage] INT NOT NULL,
  [created_at] DATETIME2(3) NOT NULL CONSTRAINT [DF_vehicles_created_at] DEFAULT SYSUTCDATETIME(),
  [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [DF_vehicles_updated_at] DEFAULT SYSUTCDATETIME(),
  CONSTRAINT [FK_vehicles_customer] FOREIGN KEY ([customer_id]) REFERENCES [dbo].[customers]([id]),
  CONSTRAINT [UQ_vehicles_license_plate] UNIQUE ([license_plate]),
  CONSTRAINT [UQ_vehicles_id_customer] UNIQUE ([id], [customer_id]),
  CONSTRAINT [CK_vehicles_year] CHECK ([model_year] >= 1886),
  CONSTRAINT [CK_vehicles_mileage] CHECK ([mileage] >= 0)
);

CREATE TABLE [dbo].[bookings] (
  [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_bookings] PRIMARY KEY DEFAULT NEWID(),
  [customer_id] UNIQUEIDENTIFIER NOT NULL,
  [vehicle_id] UNIQUEIDENTIFIER NOT NULL,
  [service_center_id] UNIQUEIDENTIFIER NOT NULL,
  [service_type_id] UNIQUEIDENTIFIER NOT NULL,
  [scheduled_at] DATETIME2(3) NOT NULL,
  [status] NVARCHAR(20) NOT NULL CONSTRAINT [DF_bookings_status] DEFAULT N'scheduled',
  [notes] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_bookings_notes] DEFAULT N'',
  [created_at] DATETIME2(3) NOT NULL CONSTRAINT [DF_bookings_created_at] DEFAULT SYSUTCDATETIME(),
  [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [DF_bookings_updated_at] DEFAULT SYSUTCDATETIME(),
  CONSTRAINT [FK_bookings_customer] FOREIGN KEY ([customer_id]) REFERENCES [dbo].[customers]([id]),
  CONSTRAINT [FK_bookings_vehicle_customer] FOREIGN KEY ([vehicle_id], [customer_id]) REFERENCES [dbo].[vehicles]([id], [customer_id]),
  CONSTRAINT [FK_bookings_service_center] FOREIGN KEY ([service_center_id]) REFERENCES [dbo].[service_centers]([id]),
  CONSTRAINT [FK_bookings_service_type] FOREIGN KEY ([service_type_id]) REFERENCES [dbo].[service_types]([id]),
  CONSTRAINT [CK_bookings_status] CHECK ([status] IN (N'scheduled', N'confirmed', N'completed', N'cancelled'))
);

CREATE INDEX [IX_vehicles_customer_id] ON [dbo].[vehicles] ([customer_id]);
CREATE INDEX [IX_bookings_service_center_scheduled_at] ON [dbo].[bookings] ([service_center_id], [scheduled_at]);
CREATE INDEX [IX_bookings_customer_scheduled_at] ON [dbo].[bookings] ([customer_id], [scheduled_at]);
CREATE INDEX [IX_bookings_vehicle_scheduled_at] ON [dbo].[bookings] ([vehicle_id], [scheduled_at]);
