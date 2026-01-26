-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT NOT NULL DEFAULT 'package',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barcode" TEXT,
    "internalCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'UNIT',
    "isWeighted" BOOLEAN NOT NULL DEFAULT false,
    "salePrice" DECIMAL NOT NULL,
    "costPrice" DECIMAL NOT NULL DEFAULT 0,
    "currentStock" DECIMAL NOT NULL DEFAULT 0,
    "minStock" DECIMAL NOT NULL DEFAULT 0,
    "maxStock" DECIMAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "oemCode" TEXT,
    "aftermarketCode" TEXT,
    "partBrand" TEXT,
    "application" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductLot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotNumber" TEXT,
    "expirationDate" DATETIME,
    "manufacturingDate" DATETIME,
    "purchaseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "initialQuantity" DECIMAL NOT NULL,
    "currentQuantity" DECIMAL NOT NULL,
    "costPrice" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "productId" TEXT NOT NULL,
    "supplierId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "ProductLot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductLot_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tradeName" TEXT,
    "cnpj" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "pin" TEXT NOT NULL,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CASHIER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "CashSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "openingBalance" DECIMAL NOT NULL DEFAULT 0,
    "expectedBalance" DECIMAL,
    "actualBalance" DECIMAL,
    "difference" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "employeeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "CashSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "description" TEXT,
    "sessionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashMovement_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CashSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dailyNumber" INTEGER NOT NULL,
    "subtotal" DECIMAL NOT NULL,
    "discountType" TEXT,
    "discountValue" DECIMAL NOT NULL DEFAULT 0,
    "discountReason" TEXT,
    "total" DECIMAL NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "amountPaid" DECIMAL NOT NULL,
    "change" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "canceledAt" DATETIME,
    "canceledById" TEXT,
    "cancelReason" TEXT,
    "employeeId" TEXT NOT NULL,
    "cashSessionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sale_canceledById_fkey" FOREIGN KEY ("canceledById") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Sale_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quantity" DECIMAL NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "discount" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL,
    "productName" TEXT NOT NULL,
    "productBarcode" TEXT,
    "productUnit" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lotId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "ProductLot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "previousStock" DECIMAL NOT NULL,
    "newStock" DECIMAL NOT NULL,
    "reason" TEXT,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "productId" TEXT NOT NULL,
    "employeeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "productId" TEXT,
    "lotId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Alert_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "ProductLot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "oldPrice" DECIMAL NOT NULL,
    "newPrice" DECIMAL NOT NULL,
    "reason" TEXT,
    "productId" TEXT NOT NULL,
    "employeeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PriceHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'STRING',
    "group" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Setting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "employeeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BusinessConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessType" TEXT NOT NULL DEFAULT 'GROCERY',
    "features" TEXT NOT NULL,
    "labels" TEXT NOT NULL,
    "isConfigured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VehicleBrand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fipeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fipeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'STREET',
    "engineSize" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "brandId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VehicleModel_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "VehicleBrand" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VehicleYear" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "yearLabel" TEXT NOT NULL,
    "fipeCode" TEXT NOT NULL,
    "fuelType" TEXT NOT NULL DEFAULT 'GASOLINE',
    "modelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VehicleYear_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductCompatibility" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedById" TEXT,
    "notes" TEXT,
    "position" TEXT,
    "productId" TEXT NOT NULL,
    "vehicleYearId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductCompatibility_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductCompatibility_vehicleYearId_fkey" FOREIGN KEY ("vehicleYearId") REFERENCES "VehicleYear" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "phone" TEXT,
    "phone2" TEXT,
    "email" TEXT,
    "zipCode" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CustomerVehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plate" TEXT,
    "chassis" TEXT,
    "renavam" TEXT,
    "color" TEXT,
    "currentKm" INTEGER,
    "nickname" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "customerId" TEXT NOT NULL,
    "vehicleYearId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerVehicle_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerVehicle_vehicleYearId_fkey" FOREIGN KEY ("vehicleYearId") REFERENCES "VehicleYear" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" INTEGER NOT NULL,
    "vehicleKm" INTEGER,
    "symptoms" TEXT,
    "diagnosis" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "laborCost" DECIMAL NOT NULL DEFAULT 0,
    "partsCost" DECIMAL NOT NULL DEFAULT 0,
    "discount" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL DEFAULT 0,
    "warrantyDays" INTEGER NOT NULL DEFAULT 30,
    "warrantyUntil" DATETIME,
    "scheduledDate" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "paymentMethod" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "internalNotes" TEXT,
    "customerId" TEXT NOT NULL,
    "customerVehicleId" TEXT NOT NULL,
    "vehicleYearId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceOrder_customerVehicleId_fkey" FOREIGN KEY ("customerVehicleId") REFERENCES "CustomerVehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceOrder_vehicleYearId_fkey" FOREIGN KEY ("vehicleYearId") REFERENCES "VehicleYear" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "discount" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL,
    "warrantyDays" INTEGER,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ServiceOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultPrice" DECIMAL NOT NULL,
    "estimatedTime" INTEGER,
    "defaultWarrantyDays" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WarrantyClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceType" TEXT NOT NULL,
    "saleItemId" TEXT,
    "orderItemId" TEXT,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" DATETIME,
    "refundAmount" DECIMAL,
    "replacementCost" DECIMAL,
    "customerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WarrantyClaim_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "clientName" TEXT NOT NULL,
    "clientCNPJ" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "budget" DECIMAL,
    "costCenter" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "managerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Contract_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkFront" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contractId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "WorkFront_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkFront_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "workFrontId" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'UN',
    "plannedQty" DECIMAL NOT NULL DEFAULT 0,
    "executedQty" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Activity_workFrontId_fkey" FOREIGN KEY ("workFrontId") REFERENCES "WorkFront" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'CENTRAL',
    "contractId" TEXT,
    "managerId" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "StockLocation_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockLocation_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockBalance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL DEFAULT 0,
    "reservedQty" DECIMAL NOT NULL DEFAULT 0,
    "availableQty" DECIMAL NOT NULL DEFAULT 0,
    "minStock" DECIMAL NOT NULL DEFAULT 0,
    "maxStock" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockBalance_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockBalance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StockLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaterialRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestNumber" INTEGER NOT NULL,
    "requestDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requesterId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "workFrontId" TEXT,
    "activityId" TEXT,
    "destinationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "rejectionReason" TEXT,
    "deliveredById" TEXT,
    "deliveredAt" DATETIME,
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "MaterialRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaterialRequest_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaterialRequest_workFrontId_fkey" FOREIGN KEY ("workFrontId") REFERENCES "WorkFront" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaterialRequest_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaterialRequest_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "StockLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaterialRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaterialRequest_deliveredById_fkey" FOREIGN KEY ("deliveredById") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaterialRequestItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "requestedQty" DECIMAL NOT NULL,
    "approvedQty" DECIMAL,
    "deliveredQty" DECIMAL NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'UN',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaterialRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaterialRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaterialRequestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transferNumber" INTEGER NOT NULL,
    "fromLocationId" TEXT NOT NULL,
    "toLocationId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "rejectionReason" TEXT,
    "shippedById" TEXT,
    "shippedAt" DATETIME,
    "receivedById" TEXT,
    "receivedAt" DATETIME,
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "StockTransfer_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "StockLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockTransfer_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "StockLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockTransfer_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockTransfer_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockTransfer_shippedById_fkey" FOREIGN KEY ("shippedById") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockTransfer_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockTransferItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transferId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lotId" TEXT,
    "requestedQty" DECIMAL NOT NULL,
    "shippedQty" DECIMAL,
    "receivedQty" DECIMAL,
    "unit" TEXT NOT NULL DEFAULT 'UN',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "StockTransfer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockTransferItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockTransferItem_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "ProductLot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaterialConsumption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unitCost" DECIMAL NOT NULL,
    "totalCost" DECIMAL NOT NULL,
    "consumedById" TEXT NOT NULL,
    "consumedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaterialConsumption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaterialConsumption_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StockLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaterialConsumption_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaterialConsumption_consumedById_fkey" FOREIGN KEY ("consumedById") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Category_name_idx" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_isActive_idx" ON "Category"("isActive");

-- CreateIndex
CREATE INDEX "Category_deletedAt_idx" ON "Category"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "Product_internalCode_key" ON "Product"("internalCode");

-- CreateIndex
CREATE INDEX "Product_barcode_idx" ON "Product"("barcode");

-- CreateIndex
CREATE INDEX "Product_internalCode_idx" ON "Product"("internalCode");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_currentStock_idx" ON "Product"("currentStock");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE INDEX "Product_oemCode_idx" ON "Product"("oemCode");

-- CreateIndex
CREATE INDEX "Product_partBrand_idx" ON "Product"("partBrand");

-- CreateIndex
CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");

-- CreateIndex
CREATE INDEX "ProductLot_productId_idx" ON "ProductLot"("productId");

-- CreateIndex
CREATE INDEX "ProductLot_expirationDate_idx" ON "ProductLot"("expirationDate");

-- CreateIndex
CREATE INDEX "ProductLot_status_idx" ON "ProductLot"("status");

-- CreateIndex
CREATE INDEX "ProductLot_supplierId_idx" ON "ProductLot"("supplierId");

-- CreateIndex
CREATE INDEX "ProductLot_deletedAt_idx" ON "ProductLot"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_cnpj_key" ON "Supplier"("cnpj");

-- CreateIndex
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");

-- CreateIndex
CREATE INDEX "Supplier_cnpj_idx" ON "Supplier"("cnpj");

-- CreateIndex
CREATE INDEX "Supplier_isActive_idx" ON "Supplier"("isActive");

-- CreateIndex
CREATE INDEX "Supplier_deletedAt_idx" ON "Supplier"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_cpf_key" ON "Employee"("cpf");

-- CreateIndex
CREATE INDEX "Employee_cpf_idx" ON "Employee"("cpf");

-- CreateIndex
CREATE INDEX "Employee_pin_idx" ON "Employee"("pin");

-- CreateIndex
CREATE INDEX "Employee_role_idx" ON "Employee"("role");

-- CreateIndex
CREATE INDEX "Employee_isActive_idx" ON "Employee"("isActive");

-- CreateIndex
CREATE INDEX "Employee_deletedAt_idx" ON "Employee"("deletedAt");

-- CreateIndex
CREATE INDEX "CashSession_employeeId_idx" ON "CashSession"("employeeId");

-- CreateIndex
CREATE INDEX "CashSession_status_idx" ON "CashSession"("status");

-- CreateIndex
CREATE INDEX "CashSession_openedAt_idx" ON "CashSession"("openedAt");

-- CreateIndex
CREATE INDEX "CashSession_deletedAt_idx" ON "CashSession"("deletedAt");

-- CreateIndex
CREATE INDEX "CashMovement_sessionId_idx" ON "CashMovement"("sessionId");

-- CreateIndex
CREATE INDEX "CashMovement_type_idx" ON "CashMovement"("type");

-- CreateIndex
CREATE INDEX "CashMovement_createdAt_idx" ON "CashMovement"("createdAt");

-- CreateIndex
CREATE INDEX "Sale_employeeId_idx" ON "Sale"("employeeId");

-- CreateIndex
CREATE INDEX "Sale_cashSessionId_idx" ON "Sale"("cashSessionId");

-- CreateIndex
CREATE INDEX "Sale_status_idx" ON "Sale"("status");

-- CreateIndex
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");

-- CreateIndex
CREATE INDEX "Sale_dailyNumber_idx" ON "Sale"("dailyNumber");

-- CreateIndex
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleItem_productId_idx" ON "SaleItem"("productId");

-- CreateIndex
CREATE INDEX "SaleItem_lotId_idx" ON "SaleItem"("lotId");

-- CreateIndex
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");

-- CreateIndex
CREATE INDEX "StockMovement_employeeId_idx" ON "StockMovement"("employeeId");

-- CreateIndex
CREATE INDEX "StockMovement_type_idx" ON "StockMovement"("type");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_type_idx" ON "Alert"("type");

-- CreateIndex
CREATE INDEX "Alert_severity_idx" ON "Alert"("severity");

-- CreateIndex
CREATE INDEX "Alert_isRead_idx" ON "Alert"("isRead");

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

-- CreateIndex
CREATE INDEX "Alert_isRead_severity_idx" ON "Alert"("isRead", "severity");

-- CreateIndex
CREATE INDEX "PriceHistory_productId_idx" ON "PriceHistory"("productId");

-- CreateIndex
CREATE INDEX "PriceHistory_employeeId_idx" ON "PriceHistory"("employeeId");

-- CreateIndex
CREATE INDEX "PriceHistory_createdAt_idx" ON "PriceHistory"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "Setting_key_idx" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "Setting_group_idx" ON "Setting"("group");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_employeeId_idx" ON "AuditLog"("employeeId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleBrand_fipeCode_key" ON "VehicleBrand"("fipeCode");

-- CreateIndex
CREATE INDEX "VehicleBrand_name_idx" ON "VehicleBrand"("name");

-- CreateIndex
CREATE INDEX "VehicleBrand_fipeCode_idx" ON "VehicleBrand"("fipeCode");

-- CreateIndex
CREATE INDEX "VehicleBrand_isActive_idx" ON "VehicleBrand"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_fipeCode_key" ON "VehicleModel"("fipeCode");

-- CreateIndex
CREATE INDEX "VehicleModel_brandId_idx" ON "VehicleModel"("brandId");

-- CreateIndex
CREATE INDEX "VehicleModel_name_idx" ON "VehicleModel"("name");

-- CreateIndex
CREATE INDEX "VehicleModel_category_idx" ON "VehicleModel"("category");

-- CreateIndex
CREATE INDEX "VehicleModel_isActive_idx" ON "VehicleModel"("isActive");

-- CreateIndex
CREATE INDEX "VehicleYear_modelId_idx" ON "VehicleYear"("modelId");

-- CreateIndex
CREATE INDEX "VehicleYear_year_idx" ON "VehicleYear"("year");

-- CreateIndex
CREATE INDEX "VehicleYear_fipeCode_idx" ON "VehicleYear"("fipeCode");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleYear_modelId_year_fuelType_key" ON "VehicleYear"("modelId", "year", "fuelType");

-- CreateIndex
CREATE INDEX "ProductCompatibility_productId_idx" ON "ProductCompatibility"("productId");

-- CreateIndex
CREATE INDEX "ProductCompatibility_vehicleYearId_idx" ON "ProductCompatibility"("vehicleYearId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCompatibility_productId_vehicleYearId_key" ON "ProductCompatibility"("productId", "vehicleYearId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_cpf_key" ON "Customer"("cpf");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Customer_cpf_idx" ON "Customer"("cpf");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_isActive_idx" ON "Customer"("isActive");

-- CreateIndex
CREATE INDEX "CustomerVehicle_customerId_idx" ON "CustomerVehicle"("customerId");

-- CreateIndex
CREATE INDEX "CustomerVehicle_plate_idx" ON "CustomerVehicle"("plate");

-- CreateIndex
CREATE INDEX "CustomerVehicle_vehicleYearId_idx" ON "CustomerVehicle"("vehicleYearId");

-- CreateIndex
CREATE INDEX "CustomerVehicle_isActive_idx" ON "CustomerVehicle"("isActive");

-- CreateIndex
CREATE INDEX "ServiceOrder_customerId_idx" ON "ServiceOrder"("customerId");

-- CreateIndex
CREATE INDEX "ServiceOrder_customerVehicleId_idx" ON "ServiceOrder"("customerVehicleId");

-- CreateIndex
CREATE INDEX "ServiceOrder_vehicleYearId_idx" ON "ServiceOrder"("vehicleYearId");

-- CreateIndex
CREATE INDEX "ServiceOrder_employeeId_idx" ON "ServiceOrder"("employeeId");

-- CreateIndex
CREATE INDEX "ServiceOrder_status_idx" ON "ServiceOrder"("status");

-- CreateIndex
CREATE INDEX "ServiceOrder_orderNumber_idx" ON "ServiceOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "ServiceOrder_createdAt_idx" ON "ServiceOrder"("createdAt");

-- CreateIndex
CREATE INDEX "ServiceOrderItem_orderId_idx" ON "ServiceOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "ServiceOrderItem_productId_idx" ON "ServiceOrderItem"("productId");

-- CreateIndex
CREATE INDEX "ServiceOrderItem_itemType_idx" ON "ServiceOrderItem"("itemType");

-- CreateIndex
CREATE UNIQUE INDEX "Service_code_key" ON "Service"("code");

-- CreateIndex
CREATE INDEX "Service_code_idx" ON "Service"("code");

-- CreateIndex
CREATE INDEX "Service_name_idx" ON "Service"("name");

-- CreateIndex
CREATE INDEX "Service_isActive_idx" ON "Service"("isActive");

-- CreateIndex
CREATE INDEX "WarrantyClaim_customerId_idx" ON "WarrantyClaim"("customerId");

-- CreateIndex
CREATE INDEX "WarrantyClaim_status_idx" ON "WarrantyClaim"("status");

-- CreateIndex
CREATE INDEX "WarrantyClaim_sourceType_idx" ON "WarrantyClaim"("sourceType");

-- CreateIndex
CREATE INDEX "WarrantyClaim_createdAt_idx" ON "WarrantyClaim"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_code_key" ON "Contract"("code");

-- CreateIndex
CREATE INDEX "Contract_code_idx" ON "Contract"("code");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE INDEX "Contract_managerId_idx" ON "Contract"("managerId");

-- CreateIndex
CREATE INDEX "Contract_deletedAt_idx" ON "Contract"("deletedAt");

-- CreateIndex
CREATE INDEX "WorkFront_contractId_idx" ON "WorkFront"("contractId");

-- CreateIndex
CREATE INDEX "WorkFront_supervisorId_idx" ON "WorkFront"("supervisorId");

-- CreateIndex
CREATE INDEX "WorkFront_status_idx" ON "WorkFront"("status");

-- CreateIndex
CREATE INDEX "WorkFront_deletedAt_idx" ON "WorkFront"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkFront_contractId_code_key" ON "WorkFront"("contractId", "code");

-- CreateIndex
CREATE INDEX "Activity_workFrontId_idx" ON "Activity"("workFrontId");

-- CreateIndex
CREATE INDEX "Activity_status_idx" ON "Activity"("status");

-- CreateIndex
CREATE INDEX "Activity_deletedAt_idx" ON "Activity"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_workFrontId_code_key" ON "Activity"("workFrontId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "StockLocation_code_key" ON "StockLocation"("code");

-- CreateIndex
CREATE INDEX "StockLocation_code_idx" ON "StockLocation"("code");

-- CreateIndex
CREATE INDEX "StockLocation_type_idx" ON "StockLocation"("type");

-- CreateIndex
CREATE INDEX "StockLocation_contractId_idx" ON "StockLocation"("contractId");

-- CreateIndex
CREATE INDEX "StockLocation_managerId_idx" ON "StockLocation"("managerId");

-- CreateIndex
CREATE INDEX "StockLocation_isActive_idx" ON "StockLocation"("isActive");

-- CreateIndex
CREATE INDEX "StockLocation_deletedAt_idx" ON "StockLocation"("deletedAt");

-- CreateIndex
CREATE INDEX "StockBalance_productId_idx" ON "StockBalance"("productId");

-- CreateIndex
CREATE INDEX "StockBalance_locationId_idx" ON "StockBalance"("locationId");

-- CreateIndex
CREATE INDEX "StockBalance_quantity_idx" ON "StockBalance"("quantity");

-- CreateIndex
CREATE UNIQUE INDEX "StockBalance_productId_locationId_key" ON "StockBalance"("productId", "locationId");

-- CreateIndex
CREATE INDEX "MaterialRequest_requestNumber_idx" ON "MaterialRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "MaterialRequest_requesterId_idx" ON "MaterialRequest"("requesterId");

-- CreateIndex
CREATE INDEX "MaterialRequest_contractId_idx" ON "MaterialRequest"("contractId");

-- CreateIndex
CREATE INDEX "MaterialRequest_workFrontId_idx" ON "MaterialRequest"("workFrontId");

-- CreateIndex
CREATE INDEX "MaterialRequest_destinationId_idx" ON "MaterialRequest"("destinationId");

-- CreateIndex
CREATE INDEX "MaterialRequest_status_idx" ON "MaterialRequest"("status");

-- CreateIndex
CREATE INDEX "MaterialRequest_priority_idx" ON "MaterialRequest"("priority");

-- CreateIndex
CREATE INDEX "MaterialRequest_createdAt_idx" ON "MaterialRequest"("createdAt");

-- CreateIndex
CREATE INDEX "MaterialRequest_deletedAt_idx" ON "MaterialRequest"("deletedAt");

-- CreateIndex
CREATE INDEX "MaterialRequestItem_requestId_idx" ON "MaterialRequestItem"("requestId");

-- CreateIndex
CREATE INDEX "MaterialRequestItem_productId_idx" ON "MaterialRequestItem"("productId");

-- CreateIndex
CREATE INDEX "StockTransfer_transferNumber_idx" ON "StockTransfer"("transferNumber");

-- CreateIndex
CREATE INDEX "StockTransfer_fromLocationId_idx" ON "StockTransfer"("fromLocationId");

-- CreateIndex
CREATE INDEX "StockTransfer_toLocationId_idx" ON "StockTransfer"("toLocationId");

-- CreateIndex
CREATE INDEX "StockTransfer_requesterId_idx" ON "StockTransfer"("requesterId");

-- CreateIndex
CREATE INDEX "StockTransfer_status_idx" ON "StockTransfer"("status");

-- CreateIndex
CREATE INDEX "StockTransfer_createdAt_idx" ON "StockTransfer"("createdAt");

-- CreateIndex
CREATE INDEX "StockTransfer_deletedAt_idx" ON "StockTransfer"("deletedAt");

-- CreateIndex
CREATE INDEX "StockTransferItem_transferId_idx" ON "StockTransferItem"("transferId");

-- CreateIndex
CREATE INDEX "StockTransferItem_productId_idx" ON "StockTransferItem"("productId");

-- CreateIndex
CREATE INDEX "StockTransferItem_lotId_idx" ON "StockTransferItem"("lotId");

-- CreateIndex
CREATE INDEX "MaterialConsumption_productId_idx" ON "MaterialConsumption"("productId");

-- CreateIndex
CREATE INDEX "MaterialConsumption_locationId_idx" ON "MaterialConsumption"("locationId");

-- CreateIndex
CREATE INDEX "MaterialConsumption_activityId_idx" ON "MaterialConsumption"("activityId");

-- CreateIndex
CREATE INDEX "MaterialConsumption_consumedById_idx" ON "MaterialConsumption"("consumedById");

-- CreateIndex
CREATE INDEX "MaterialConsumption_consumedAt_idx" ON "MaterialConsumption"("consumedAt");
