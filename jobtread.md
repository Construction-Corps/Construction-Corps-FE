# JobTread API Documentation

> **A more complete, actively-maintained version of this reference lives in
> the CCBE repo:** [`docs/JOBTREAD_API_GUIDE.md`](https://github.com/Construction-Corps/CCBE/blob/main/docs/JOBTREAD_API_GUIDE.md).
> It has everything below plus verified entity shapes/traps (custom fields,
> `where` clause gotchas, 413s on deep nesting, document field names, etc.)
> and a testing methodology for an AI working from a grant key alone. Prefer
> that doc for new work; this file is kept for the FE-specific integration
> notes (file upload / comment helpers) below that don't apply outside this
> codebase.

This document provides a comprehensive reference for integrating with the JobTread API. It covers both essential integration details (such as file uploads and comment creation) and an extensive API overview spanning authentication, webhooks, and advanced querying using the Pave query language.

---

## Overview

The JobTread API is built on the **Pave query language**—conceptually similar to GraphQL—that allows you to:

- **Query exactly what you need:** Only request the fields required.
- **Use connection fields:** Efficiently query related objects.
- **Leverage pagination, sorting, and filtering:** Tailor responses to your requirements.

---

## Common Request Structure

All API requests are sent via **POST** to:

    https://api.jobtread.com/pave

Each request wraps the operation under a `"query"` key and includes the following standard elements:

### Standard Fields

- **Grant Key (Authentication):**

      { "$": { "grantKey": "22SkCV5JXCtY6eKk5w2ZWBsyhpBBrr6Lea" } }

- **Current Grant Information:**

      "currentGrant": { "id": {} }

---

## Authentication & Grants

- **Grant Creation:**  
  Create a grant via the grant management page. The grant key is displayed only once on creation.

- **Using the Grant:**  
  Include your grant key on every API call. For example:

      {
        "query": {
          "$": { "grantKey": "{{YOUR_GRANT_KEY}}" },
          "currentGrant": { "id": {} }
        }
      }

- **Example cURL Request:**

      curl https://api.jobtread.com/pave -d '{
        "query": {
          "$": { "grantKey": "{{YOUR_GRANT_KEY}}" },
          "currentGrant": { "id": {} }
        }
      }'

---

## Integration Endpoints in Code

### File Upload (via `createUploadRequest`)

- **Purpose:**  
  The `uploadFile` function sends a request to create a file upload record.

- **Payload Details:**
  - **organizationId:** `"22NwWhUAf6VB"`
  - **url:** The file URL.
  - **type:** Derived from the uploaded file (using `inputData.filetype.split(',')[1]`).

- **Response Handling:**
  - Expects the new upload request's ID at:
    
        data.createUploadRequest.createdUploadRequest.id

  - On success, a file object is constructed such as:

        { uploadRequestId, name: filename }

  - In case of failure, an error is thrown with details.

### Comment Creation (via `createComment`)

- **Purpose:**  
  The `createComment` function posts a comment to a job thread.

- **Payload Details:**
  - **files:** An array of file objects (if any).
  - **message:** The comment text, processed by the helper function `extractLatestReply`.
  - **name:** The subject of the comment.
  - **targetId:** The job ID.
  - **targetType:** Set to `'job'`.

- **Response Handling:**
  - The response is logged and returned.
  - Errors are caught, logged, and re-thrown for appropriate error management.

### Helper Function: `extractLatestReply`

- **Purpose:**  
  Ensures that the message does not exceed the maximum length (4096 characters). It:
  - Splits the message to remove forwarded or reply text.
  - Truncates and appends notices as needed (e.g., "[Message truncated]", "[Previous emails omitted for length]").

---

## Webhooks

JobTread supports webhooks to provide real-time notifications when specific events occur (such as file uploads, task updates, or customer creation).

- **How It Works:**  
  When events are triggered, a detailed POST is sent to a user-defined URL.
  
- **Configuration:**  
  Webhooks are set up on the Webhooks page within the JobTread application.

---

## API Explorer and Getting Started

### API Explorer

The API Explorer has three primary panes:

- **Schema Pane:**  
  Explore API types and operations; click on objects to view their fields and inputs.
  
- **Query Pane:**  
  Write and execute queries directly.
  
- **Usage:**  
  Experiment with example queries to learn how the API works.

### Determining Your Organization ID

Use the `My Organizations` query:

      currentGrant:
        user:
          id: {}
          name: {}
          memberships:
            nextPage: {}
            nodes:
              id: {}
              organization:
                id: {}
                name: {}

From the response, identify your organization ID (e.g., "22NwWhUAf6VB").

---

## Querying the API with Pave

Pave's flexible query language enables advanced querying.

### Basic Query Structure

Inputs are provided within a `$` object. Fields to be returned are defined at the same level.

### Creating Accounts

**Create Customer:**

      createAccount:
        $:
          organizationId: 22NwWhUAf6VB
          name: Test Name
          type: customer
        createdAccount:
          id: {}
          name: {}
          createdAt: {}
          type: {}
          organization:
            id: {}
            name: {}

**Create Vendor:**

      createAccount:
        $:
          organizationId: 22NwWhUAf6VB
          name: Test Name
          type: vendor
        createdAccount:
          id: {}
          name: {}
          createdAt: {}
          type: {}
          organization:
            id: {}
            name: {}

### Querying, Updating, and Deleting Accounts

**Query Customer:**

      account:
        $:
          id: "{{CREATED_ACCOUNT_ID}}"
        id: {}
        name: {}
        isTaxable: {}
        type: {}

**Update Customer:**

      updateAccount:
        $:
          id: "{{CREATED_ACCOUNT_ID}}"
          isTaxable: false
        account:
          $:
            id: "{{CREATED_ACCOUNT_ID}}"
          id: {}
          name: {}
          isTaxable: {}

**Delete Customer:**

      deleteAccount:
        $:
          id: "{{CREATED_ACCOUNT_ID}}"

### Connection Fields and Pagination

**Find Accounts:**

      organization:
        $:
          id: 22NwWhUAf6VB
        id: {}
        accounts:
          nextPage: {}
          nodes:
            id: {}
            name: {}
            type: {}

**Paginated Query:**

      organization:
        $:
          id: 22NwWhUAf6VB
        id: {}
        accounts:
          $:
            size: 5
            page: "{{PAGE_ID}}"
          nextPage: {}
          previousPage: {}
          nodes:
            id: {}
            name: {}
            type: {}

### Sorting and Filtering

**Sorted Query:**

      organization:
        $:
          id: 22NwWhUAf6VB
        id: {}
        accounts:
          $:
            size: 5
            sortBy:
              - field: type
                order: desc
              - field: name
          nextPage: {}
          previousPage: {}
          nodes:
            id: {}
            name: {}
            type: {}

**Filtering Example:**

      organization:
        $:
          id: 22NwWhUAf6VB
        id: {}
        accounts:
          $:
            where:
              - [ name, "=", Test Name ]
          nodes:
            id: {}
            name: {}
            type: {}

**Complex Filtering:**

      organization:
        $:
          id: 22NwWhUAf6VB
        id: {}
        accounts:
          $:
            where:
              and:
                - [ name, "=", Test Name ]
                - [ type, "=", customer ]
          nodes:
            id: {}
            name: {}
            type: {}

### Custom Fields and Advanced Operations

**Get Custom Fields for Organization:**

      organization:
        $:
          id: 22NwWhUAf6VB
        id: {}
        customFields:
          $:
            sortBy:
              - field: targetType
              - field: position
          nodes:
            id: {}
            name: {}
            type: {}
            targetType: {}

**Get Custom Field Values:**

      customFieldValues:
        $:
          size: 25
        nodes:
          id: {}
          value: {}
          customField:
            id: {}

**Update Account Custom Fields:**

      updateAccount:
        $:
          id: "{{CREATED_ACCOUNT_ID}}"
          customFieldValues:
            "{{CUSTOM_FIELD_ID}}": "{{CUSTOM_FIELD_VALUE}}"
        account:
          $:
            id: "{{CREATED_ACCOUNT_ID}}"
          id: {}
          name: {}
          customFieldValues:
            $:
              size: 25
            nodes:
              id: {}
              value: {}
              customField:
                id: {}

**Search by Custom Field Values:**

      organization:
        $:
          id: 22NwWhUAf6VB
        id: {}
        contacts:
          $:
            with:
              cf:
                _: customFieldValues
                $:
                  where:
                    - [ customField, name, "{{CUSTOM_FIELD_NAME}}" ]
                values:
                  $:
                    field: value
            where:
              - [ cf, values, "=", "{{CUSTOM_FIELD_VALUE}}" ]
          nodes:
            id: {}
            name: {}

### Additional Queries

**Get Job Summary:**

      job:
        $:
          id: "{{JOB_ID}}"
        id: {}
        documents:
          $:
            where:
              or:
                - and:
                    - [ type, bidRequest ]
                    - [ status, pending ]
                - and:
                    - [ type, vendorOrder ]
                    - [ status, in, [ pending, approved ] ]
                - and:
                    - [ type, customerOrder ]
                    - [ status, in, [ pending, approved ] ]
                    - [ includeInBudget, true ]
                - and:
                    - [ type, vendorBill ]
                    - [ status, in, [ draft, pending ] ]
                - and:
                    - [ type, customerInvoice ]
                    - [ status, in, [ pending, approved ] ]
            group:
              by: [ type, status ]
              aggs:
                amountPaid:
                  sum: amountPaid
                cost:
                  sum: cost
                count:
                  count: []
                priceWithTax:
                  sum: priceWithTax
            withValues: {}

**Get Document PDF URL:**

Append the returned PDF token to:

    https://api.jobtread.com/t/

Example request:

      pdfToken:
        _: signQuery
        $:
          query:
            pdf:
              $:
                id: document
                options:
                  id: "{{DOCUMENT_ID}}"

**Get Documents by Name:**

      organization:
        $:
          id: 22NwWhUAf6VB
        id: {}
        documents:
          $:
            where:
              or:
                - [ name, Expense ]
                - [ name, Bill ]
          nodes:
            id: {}
            name: {}
            type: {}

**Get Open Invoices:**

      organization:
        $:
          id: 22NwWhUAf6VB
        id: {}
        documents:
          $:
            where:
              and:
                - [ type, customerInvoice ]
                - [ status, pending ]
                - [ price, ">", 0 ]
            sortBy:
              - field: price
                order: desc
            size: 5
          nodes:
            id: {}
            cost: {}
            price: {}
            tax: {}
            name: {}
            number: {}
            job:
              id: {}
              name: {}
              number: {}
          nextPage: {}

**Sum Approved Customer Orders on a Job:**

      job:
        $:
          id: "{{JOB_ID}}"
        documents:
          $:
            where:
              and:
                - [ type, customerOrder ]
                - [ status, approved ]
                - [ includeInBudget, true ]
          sum:
            $: priceWithTax

---

## Frequently Asked Questions (FAQ)

- **"id field required" Error:**  
  Always include the `id` field in the query output for each object.

- **Rate Limiting:**  
  Each grant key is limited to a certain number of requests per timeframe to prevent abuse.

---

## Conclusion

The JobTread API—powered by the Pave query language—offers a robust, flexible interface for interacting with the platform. Use the API Explorer to experiment with queries and configure webhooks for real-time notifications. This document serves as a comprehensive reference. Keep it updated as new features and enhancements emerge.

---

## API Endpoints and Options

Below is a comprehensive list of API operations and options as provided in the JobTread API documentation. This entire schema starts at the root of the query object.

Search...
Path
schema.root object = {}

This is where all queries start.
Input
grantKey nullable string
The grant key to use to authorize this request.

timeZone nullable timeZone
Set the IANA time zone to use when handling time-zone-aware data.

viaUserId nullable jobtreadId
Restr
plaintext
Search...
Path
schema.root object = {}
This is where all queries start.
Input
grantKey nullable string
The grant key to use to authorize this request.
timeZone nullable timeZone
Set the IANA time zone to use when handling time-zone-aware data.
viaUserId nullable jobtreadId
Restrict results to a specific user scope.
Object
account({ id }) nullable account
can({ action, id }) boolean
closeNegativePayable({ id, description, paidAt, type }) root
comment({ id }) nullable comment
commentFile({ id }) nullable commentFile
contact({ id }) nullable contact
copyTaskTemplateToTarget({ grantAccess, targetId, targetType, notify, startDate, startTime, taskTemplateId }) root
costCode({ id }) nullable costCode
costGroup({ id }) nullable costGroup
costItem({ id }) nullable costItem
costType({ id }) nullable costType
countryCodes array of countryCode
createAccount({ archive, customFieldValues, isTaxable, name, notify, organizationId, qbdIntegrationSalesTaxCodeId, qbdIntegrationSalesTaxItemId, suffixIfNecessary, type }) root
createAce({ assignee, notify, targetId, targetType }) root
createComment({ assignees, files, isVisibleToAll, isVisibleToCustomerRoles, isVisibleToInternalRoles, isVisibleToVendorRoles, message, name, parentCommentId, targetId, targetType }) root
createConferenceEventAttendee({ conferenceEventId, conferenceId }) root
createContact({ accountId, customFieldValues, name, title }) root
createCostCodeMapping({ sourceCostCodeId, targetCostCodeId }) root
createCostCode({ name, number, organizationId, parentCostCodeId, qbdIntegrationItemId }) root
createCostGroup({ description, files, isSelected, lineItems, maxSelectionsAllowed, minSelectionsRequired, name, quantity, quantityFormula, showChildCosts, showChildDeltas, showChildren, showDescription, unitId, documentId, jobId, organizationId, parentCostGroupId, positionAfter }) root
createCostItem({ allowanceType, costCodeId, costTypeId, customFieldValues, description, files, globalId, hasFinalActualCost, isEditable, isSelected, isSpecification, isTaxable, jobCostItemId, name, organizationCostItemId, quantity, quantityFormula, requireSpecificationApproval, showDescription, showQuantity, sourceCostItemId, unitCost, unitCostFormula, unitId, unitPrice, unitPriceFormula, costGroupId, documentId, jobId, organizationId, positionAfter }) root
createCostTypeMapping({ sourceCostTypeId, targetCostTypeId }) root
createCostType({ isTaxable, isTimeTrackable, margin, name, organizationId }) root
createCustomFieldMapping({ sourceCustomFieldId, targetCustomFieldId }) root
createCustomField({ defaultValue, maxValuesAllowed, minValuesRequired, name, options, organizationId, positionAfterCustomFieldId, showOnSpecifications, targetType, type }) root
createdAccount nullable account
createdAce nullable ace
createDailyLog({ assignees, customFieldValues, date, files, jobId, notes, notify }) root
createDataView({ name, organizationId, type, options, positionAfterDataViewId, fields, userId }) root
createdComment nullable comment
createdCompanyCamIntegration nullable companycamIntegration
createdConferenceEventAttendee nullable conferenceEventAttendee
createdContact nullable contact
createdCostCode nullable costCode
createdCostGroup nullable costGroup
createdCostItem nullable costItem
createdCostType nullable costType
createdCustomField nullable customField
createdCustomNotificationType nullable customNotificationType
createdDailyLog nullable dailyLog
createdDataView nullable dataView
createdDocument nullable document
createdDocumentPayment nullable documentPayment
createdDocumentRecipient nullable documentRecipient
createdDocumentTemplate nullable documentTemplate
createdEphemeralEvent nullable object
createdEvent nullable event
createdEvoIntegration nullable evoIntegration
createdEvoIntegrationTransaction nullable evoIntegrationTransaction
createdFeatureRequest nullable featureRequest
createdFile nullable file
createdFileTag nullable fileTag
createdGrant nullable grant
createdJob nullable job
createdJobBudgetBackup nullable jobBudgetBackup
createdJobHoverJob nullable jobHoverJob
createdLocation nullable location
createdMembership nullable membership
createdNicejobIntegration nullable nicejobIntegration
createdNotification nullable notification
createdNotificationSubscription nullable notificationSubscription
createDocument({ accountId, allowanceCostItemId, allowPartialPayments, coverPageTitle, coverPagePhoto, coverPageSubtitle, coverPageTemplate, lineItems, description, descriptionPdf, dueDate, dueDays, emailMessage, externalId, files, footer, footerPdf, fromAddress, fromEmailAddress, fromName, fromOrganizationName, fromPhoneNumber, includeInBudget, issueDate, jobId, jobLocationAddress, jobLocationName, name, nonRecoverableTaxName, nonRecoverableTax, paymentMethods, qboAccountId, qboClassId, qboIsBillable, qboTaxCodeId, qboIsIgnored, references, requireSignature, showChildCosts, showCostItemFiles, showFinancing, showLinesAtDepth, showProfit, showProgress, showQboInvoiceLink, showQuantity, subject, tax, taxName, taxRate, toAddress, toEmailAddress, toName, toOrganizationName, toPhoneNumber, type }) root
createDocumentPayment({ amount, documentId, isLinkedToQbo, paymentId }) root
createDocumentRecipient({ assignee, documentId, requireSignature }) root
createDocumentReference({ documentId, reference }) root
createDocumentTemplate({ allowPartialPayments, coverPageTitle, coverPagePhoto, coverPageSubtitle, coverPageTemplate, description, descriptionPdf, name, dueDays, emailMessage, fileIds, footer, footerPdf, fromAddress, fromEmailAddress, fromName, fromOrganizationName, fromPhoneNumber, includeInBudget, nonRecoverableTaxName, organizationId, requireSignature, showChildCosts, showCostItemFiles, showFinancing, showLinesAtDepth, showProfit, showProgress, showQuantity, taxName, templateName, type }) root
createdOrganization nullable organization
createdOrganizationConnection nullable organizationConnection
createdPayment nullable payment
createdPlaidIntegration nullable plaidIntegration
createdQbdIntegration nullable qbdIntegration
createdQboIntegration nullable qboIntegration
createdQboIntegrationItem nullable qboIntegrationItem
createdRole nullable role
createdSlackIntegration nullable slackIntegration
createdStripeIntegration nullable stripeIntegration
createdStripeIntegrationPaymentIntent nullable stripeIntegrationPaymentIntent
createdTask nullable task
createdTaskTemplate nullable taskTemplate
createdTaskType nullable taskType
createdTimeEntry nullable timeEntry
createdUnit nullable unit
createdUploadRequest nullable uploadRequest
createdUser nullable user
createdWebForm nullable webForm
createdWebhook nullable webhook
createFile({ annotatedUploadRequestId, copyFromFileId, copyFromFile, description, fileTagIds, folder, name, targetId, targetType, uploadRequestId }) root
createFileTag({ name, description, color, organizationId }) root
createJob({ closedOn, companycamId, copyCostsFromJobId, copyTasksFromJobId, coverPhoto, customFieldValues, description, lineItems, locationId, name, number, parameters, priceType, qbdId, qboClassId, qboId, specificationsDescription, specificationsFooter }) root
createJobBudgetBackup({ jobId, uploadRequestId }) root
createLocation({ accountId, address, contactId, customFieldValues, customTaxRate, name, parseAddress, qboTaxCodeId }) root
createMarketplacePartner({ youtubeVideoId, isPremium, publishedAt, categories, emailRecipients, description, summary, organizationId }) root
createMembership(one of new or existing) root
createPayment({ accountId, amount, attemptAutoMatch, description, externalId, organizationId, paidAt, source, type }) root
createPlaidIntegration({ isSandbox, organizationId, plaidPublicToken }) root
createPlan({ fileId, jobId, name, page, scale }) root
createRole({ defaultAccountTaskDataViewId, defaultAccountToDoDataViewId, defaultCostItemDataViewId, defaultCustomerDataViewId, defaultDocumentDataViewId, defaultEventDataViewId, defaultJobBudgetDataViewId, defaultJobDataViewId, defaultJobTaskDataViewId, defaultJobToDoDataViewId, defaultLocationDataViewId, defaultOrganizationTaskDataViewId, defaultOrganizationToDoDataViewId, defaultPaymentDataViewId, defaultVendorDataViewId, name, organizationId, permissions, type, visibleFolders }) root
createTask({ assignedMembershipIds, assignees, dependentTasks, dependsOnTasks, description, endDate, endTime, files, isGroup, isToDo, name, notify, parentTaskId, positionAfterTaskId, progress, startDate, startTime, subtasks, baselineEndDate, baselineEndTime, targetId, baselineStartDate, baselineStartTime, targetType, taskTypeId }) root
createTasksFromBudget({ jobId }) root
createTaskTemplate({ name, organizationId, copyTasksFromJobId, copyFrom, isToDo }) root
createTaskType({ name, color, organizationId }) root
createTimeEntry({ costItemId, endCoordinates, endedAt, isApproved, jobId, notes, organizationId, startCoordinates, startedAt, type, userId }) root
createUnitMapping({ sourceUnitId, targetUnitId }) root
createUnit({ name, organizationId }) root
createUploadRequest({ annotations, captchaToken, organizationId, size, type, url, webFormKey }) root
createUserAndOrganization({ address, captchaToken, countryCode, currencyCode, emailAddress, languageCode, nonWorkingDates, organizationName, password, phoneNumber, promoCode, seats, stripeTokenId, userName, workingDaysOfWeek }) root
createWebForm({ assignedMembershipIds, fields, name, organizationId, successMessage, successUrl, type }) root
createWebhook({ eventTypes, organizationId, url }) root
currencyCodes array of currencyCode
currentGrant nullable grant
The Grant used to authenticate the request
customField({ id }) nullable customField
dailyLog({ id }) nullable dailyLog
dataView({ id }) nullable dataView
deleteAccount({ id }) root
deleteAce({ id }) root
deleteComment({ id, preserveChildren }) root
deleteConferenceEventAttendee({ id }) root
deleteContact({ id }) root
deleteCostCodeMapping({ targetOrganizationId, sourceCostCodeId }) root
deleteCostCode({ id, mergeWithCostCodeId }) root
deleteCostGroup({ id }) root
deleteCostItem({ id }) root
deleteCostTypeMapping({ targetOrganizationId, sourceCostTypeId }) root
deleteCostType({ id, mergeWithCostTypeId }) root
deleteCustomFieldMapping({ targetOrganizationId, sourceCustomFieldId }) root
deleteCustomField({ id }) root
deleteDailyLog({ id }) root
deleteDataView({ id }) root
deleteDocument({ id }) root
deleteDocumentPayment({ id }) root
deleteDocumentRecipient({ id }) root
deleteDocumentReference({ documentId, reference }) root
deleteDocumentTemplate({ id }) root
deleteFile({ id }) root
deleteFileTag({ id }) root
deleteGrant({ id }) root
deleteJob({ id }) root
deleteJobEagleviewReport({ id }) root
deleteJobHoverJob({ hoverJobId, jobId }) root
deleteJobRendrSpace({ rendrSpaceId, jobId }) root
deleteLocation({ id }) root
deleteMarketplacePartner({ id }) root
deletePayment({ id }) root
deletePlan({ id }) root
deleteRole({ id }) root
deleteTask({ id }) root
deleteTaskTemplate({ id }) root
deleteTaskType({ id }) root
deleteTimeEntry({ id }) root
deleteUnitMapping({ targetOrganizationId, sourceUnitId }) root
deleteUnit({ id, mergeWithUnitId }) root
deleteWebForm({ id }) root
deleteWebhook({ id }) root
document({ id }) nullable document
documentPayment({ id }) nullable documentPayment
documentRecipient({ id }) nullable documentRecipient
documentTemplate({ id }) nullable documentTemplate
event({ id }) nullable event
eventTypes array of eventType
The possible eventType values
file({ id }) nullable file
fileTag({ id }) nullable fileTag
globalOrganization({ id }) nullable globalOrganization
grant({ id }) nullable grant
job({ id }) nullable job
languageCodes array of languageCode
lineItemFile({ id }) nullable lineItemFile
location({ id }) nullable location
markCommentAsUnread({ id }) root
membership({ id }) nullable membership
notifyTaskAssignees({ jobId, membershipIds }) root
organization(one of id) nullable organization
payment({ id }) nullable payment
pdf(one of budget, dailyLogs, document, selections, specifications or tasks = {}) nullable uploadRequest
rateLimit object
Rate limit information
renameFolder({ jobId, newName, oldName }) root
role({ id }) nullable role
schema({ scope }) object
The schema for this Pave graph
sendAceNotification({ id }) root
sendDocument({ documentRecipientId, emailMessage }) root
signQuery({ query }) string({"maxLength":null})
Sign the specified query with the current grant, returning a token that can be passed to execute that query with that grant at a later time.
slackIntegration({ id }) nullable slackIntegration
srsBranch({ branchCode }) object
submitWebForm({ captchaToken, data, key }) root
task({ id }) nullable task
taskTemplate({ id }) nullable taskTemplate
taskType({ id }) nullable taskType
timeEntry({ id }) nullable timeEntry
unit({ id }) nullable unit
updateAccount({ accountStatementDescriptors, archive, customFieldValues, id, isTaxable, name, notify, primaryContactId, primaryLocationId, qbdIntegrationSalesTaxCodeId, qbdIntegrationSalesTaxItemId, qboId }) root
updateComment({ id, files, isVisibleToAll, isVisibleToCustomerRoles, isVisibleToInternalRoles, isVisibleToVendorRoles, message, name }) root
updateCommentFile({ annotatedUploadRequestId, id, name }) root
updateContact({ customFieldValues, id, name, title }) root
updateCostCode({ id, isActive, name, number, parentCostCodeId, qbdIntegrationItemId, qboId }) root
updateCostGroup({ description, files, id, isSelected, lineItems, maxSelectionsAllowed, minSelectionsRequired, name, quantity, quantityFormula, showChildCosts, showChildDeltas, showChildren, showDescription, unitId, parentCostGroupId, positionAfter }) root
updateCostItem({ allowanceType, costCodeId, costTypeId, customFieldValues, description, files, globalId, hasFinalActualCost, id, isEditable, isSelected, isSpecification, isTaxable, jobCostItemId, name, organizationCostItemId, quantity, quantityFormula, requireSpecificationApproval, showDescription, showQuantity, unitCost, unitCostFormula, unitId, unitPrice, unitPriceFormula, costGroupId, positionAfter }) root
updateCostType({ id, isActive, isTaxable, isTimeTrackable, margin, name }) root
updateCustomField({ defaultValue, id, maxValuesAllowed, minValuesRequired, name, options, positionAfterCustomFieldId, showOnSpecifications }) root
updateDailyLog({ customFieldValues, date, id, jobId, notes }) root
updateDataView({ id, name, options, positionAfterDataViewId, fields, userId }) root
updateDocument({ accountId, allowanceCostItemId, allowPartialPayments, closeMessage, coverPageTitle, coverPagePhoto, coverPageSubtitle, coverPageTemplate, lineItems, description, descriptionPdf, dueDate, dueDays, emailMessage, externalId, footer, footerPdf, fromAddress, fromEmailAddress, fromName, fromOrganizationName, fromPhoneNumber, id, includeInBudget, issueDate, jobLocationAddress, jobLocationName, name, nonRecoverableTax, nonRecoverableTaxName, notify, paymentMethods, qboAccountId, qboClassId, qboIsBillable, qboIsIgnored, qboTaxCodeId, requireSignature, showChildCosts, showCostItemFiles, showFinancing, showLinesAtDepth, showProfit, showProgress, showQboInvoiceLink, showQuantity, signaturePath, status, subject, tax, taxName, taxRate, toAddress, toEmailAddress, toName, toOrganizationName, toPhoneNumber }) root
updateDocumentPayment({ amount, id }) root
updateDocumentRecipient({ id, requireSignature, signatoryName, signaturePath }) root
updateDocumentTemplate({ id, allowPartialPayments, coverPageTitle, coverPagePhoto, coverPageSubtitle, coverPageTemplate, description, descriptionPdf, name, dueDays, emailMessage, fileIds, footer, footerPdf, fromAddress, fromEmailAddress, fromName, fromOrganizationName, fromPhoneNumber, includeInBudget, nonRecoverableTaxName, requireSignature, showChildCosts, showCostItemFiles, showFinancing, showLinesAtDepth, showProfit, showProgress, showQuantity, taxName, templateName }) root
updateFile({ annotatedUploadRequestId, id, fileTagIds, folder, name, description }) root
updateFileTag({ id, name, description, color }) root
updateGrant({ captchaToken, id, name }) root
updateGustoIntegrationPayroll({ gustoPayrollId, organizationId }) root
updateJob({ closedOn, companycamId, coverPhoto, customFieldValues, description, endTaskId, folders, hoverJobId, id, lineItems, name, number, parameters, priceType, qbdId, qboClassId, qboId, specificationsDescription, specificationsFooter, startTaskId }) root
updateJobContact({ aceId, isVisibleToCustomerRoles, isVisibleToVendorRoles }) root
updateLineItemFile({ annotatedUploadRequestId, id, name }) root
updateLocation({ address, contactId, customFieldValues, customTaxRate, id, name, qboTaxCodeId }) root
updateMarketplacePartner({ id, youtubeVideoId, isPremium, publishedAt, categories, emailRecipients, description, summary }) root
updateMembership({ captchaToken, defaultAccountTaskDataViewId, defaultAccountToDoDataViewId, defaultCostItemDataViewId, defaultCustomerDataViewId, defaultDocumentDataViewId, defaultEventDataViewId, defaultJobBudgetDataViewId, defaultJobDataViewId, defaultJobTaskDataViewId, defaultJobToDoDataViewId, defaultLocationDataViewId, defaultOrganizationTaskDataViewId, defaultOrganizationToDoDataViewId, defaultPaymentDataViewId, defaultVendorDataViewId, gustoEmployeeId, id, isInternal, qbdIntegrationEmployeeId, qboEmployeeId, roleId, syncTimeEntriesSince, timeEntryTypes, useRoleNotificationSubscriptions }) root
updatePayment({ accountId, amount, description, externalId, id, paidAt, source }) root
updatePlan({ fileId, id, name, page, scale, annotations }) root
updateRole({ defaultAccountTaskDataViewId, defaultAccountToDoDataViewId, defaultCostItemDataViewId, defaultCustomerDataViewId, defaultDocumentDataViewId, defaultEventDataViewId, defaultIsVisibleToCustomerRoles, defaultIsVisibleToVendorRoles, defaultJobBudgetDataViewId, defaultJobDataViewId, defaultJobTaskDataViewId, defaultJobToDoDataViewId, defaultLocationDataViewId, defaultOrganizationTaskDataViewId, defaultOrganizationToDoDataViewId, defaultPaymentDataViewId, defaultVendorDataViewId, name, id, permissions, visibleFolders }) root
updateTask({ assignedMembershipIds, assignees, dependentTasks, dependsOnTasks, description, endDate, endTime, id, name, notify, parentTaskId, positionAfterTaskId, progress, startDate, startTime, subtasks, baselineEndDate, baselineEndTime, baselineStartDate, baselineStartTime, taskTypeId, updateDependentTasks }) root
updateTaskTemplate({ endTaskId, id, name, startTaskId }) root
updateTaskType({ id, name, color }) root
updateTimeEntry({ applyOvertime, costItemId, endCoordinates, endedAt, endNow, id, isApproved, jobId, notes, startCoordinates, startedAt, type }) root
updateUnit({ id, isActive, name }) root
updateUploadRequest({ annotatedUploadRequestId, id }) root
updateUser({ avatarUploaded, captchaToken, defaultMembershipDataViewId, defaultMembershipId, defaultOrganizationDataViewId, defaultUserDataViewId, dietaryRestrictions, emailAddress, emailAddressClaimCode, emailAddressClaimKey, id, name, password, phoneNumber, shirtSize }) root
updateUserCertification({ answeredQuestionIds, certificationId }) root
updateWebForm({ assignedMembershipIds, fields, id, name, successMessage, successUrl }) root
uploadRequest({ id }) nullable uploadRequest
user({ id }) nullable user
version string
The current API version
webForm({ id, key }) nullable webForm
webFormFields({ organizationId, type }) array of object
webhook({ id }) nullable webhook
whoCan({ action, id, page, with, expressions, where, size, group, sortBy }) object