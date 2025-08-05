-- CreateTable
CREATE TABLE "public"."Device" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "lastConnected" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeviceContent" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "text" TEXT,
    "duration" INTEGER NOT NULL,
    "fontSize" TEXT,
    "fontColor" TEXT,
    "backgroundColor" TEXT,
    "alt" TEXT,
    "autoplay" BOOLEAN DEFAULT false,
    "loop" BOOLEAN DEFAULT false,
    "muted" BOOLEAN DEFAULT true,
    "order" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeviceContent_deviceId_idx" ON "public"."DeviceContent"("deviceId");

-- AddForeignKey
ALTER TABLE "public"."DeviceContent" ADD CONSTRAINT "DeviceContent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "public"."Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
