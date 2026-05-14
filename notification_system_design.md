# Notification System Design

## System Design Diagram

Frontend Client
       |
       | REST API Request
       v
Notification API Server
       |
       | Store Notification
       v
 Notification Service
       |
       | Push via Socket.IO
       v
 Connected Student Clients

## Stage 1

The notification service should let the college platform create notifications, show them to students, and mark them as read. The API is protected, so every request should send an authorization token.

### Common Headers

Authorization: Bearer <access_token>
Content-Type: application/json

### Notification Object

{
  "id": "9f47af65-84d3-49cc-9b91-bc3ab7ad6f20",
  "student_id": 1042,
  "notification_type": "Placement",
  "message": "Advanced Micro Devices Inc. hiring",
  "is_read": false,
  "created_at": "2026-04-22T17:49:42Z"
}

Allowed `notification_type` values:

- `Event`
- `Result`
- `Placement`

### Create One Notification

`POST /notifications`

Request:

{
  "student_id": 1042,
  "notification_type": "Result",
  "message": "mid-sem result published"
}

Response `201 Created`:

{
  "notification": {
    "id": "9f47af65-84d3-49cc-9b91-bc3ab7ad6f20",
    "student_id": 1042,
    "notification_type": "Result",
    "message": "mid-sem result published",
    "is_read": false,
    "created_at": "2026-04-22T17:49:42Z"
  }
}

### Create Notifications For Many Students

`POST /notifications/bulk`

Request:

{
  "student_ids": [1042, 1043, 1044],
  "notification_type": "Placement",
  "message": "CSX Corporation hiring"
}

Response `201 Created`:

{
  "created_count": 3
}

### Get Notifications

`GET /notifications?limit=10&page=1&notification_type=Placement`

Query parameters:

- `limit`: number of notifications to return
- `page`: page number
- `notification_type`: optional filter for `Event`, `Result`, or `Placement`

Response `200 OK`:

{
  "notifications": [
    {
      "id": "9f47af65-84d3-49cc-9b91-bc3ab7ad6f20",
      "student_id": 1042,
      "notification_type": "Placement",
      "message": "CSX Corporation hiring",
      "is_read": false,
      "created_at": "2026-04-22T17:49:42Z"
    }
  ],
  "page": 1,
  "limit": 10
}

### Mark One Notification As Read

`PATCH /notifications/{notification_id}/read`

Response `200 OK`:

{
  "id": "9f47af65-84d3-49cc-9b91-bc3ab7ad6f20",
  "is_read": true
}

### Mark All Notifications As Read

`PATCH /notifications/read-all`

Response `200 OK`:

{
  "updated_count": 8
}

### Error Format

{
  "error": "notification_type must be Event, Result, or Placement"
}

Common status codes:

- `400 Bad Request`: invalid input
- `401 Unauthorized`: missing or invalid token
- `404 Not Found`: student or notification not found
- `500 Internal Server Error`: unexpected server error

### Real-Time Notification Idea

For real-time updates, connected student clients can stay connected through Socket.IO. When a new notification is created through the REST API, the notification service stores it and emits a new_notification event to connected clients.

## Stage 2

For persistent storage, I would use MySQL. The data is structured, the fields are known in advance, and the main operations are simple reads and writes. MySQL is also easy to explain, maintain, and index for this use case.

### Tables

CREATE TABLE students (
  id BIGINT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE notifications (
  id CHAR(36) PRIMARY KEY,
  student_id BIGINT NOT NULL,
  notification_type ENUM('Event', 'Result', 'Placement') NOT NULL,
  message VARCHAR(255) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_notifications_student
    FOREIGN KEY (student_id) REFERENCES students(id)
);

### Indexes

CREATE INDEX idx_notifications_student_created
ON notifications (student_id, created_at DESC);

CREATE INDEX idx_notifications_student_read
ON notifications (student_id, is_read, created_at DESC);

CREATE INDEX idx_notifications_type_created
ON notifications (notification_type, created_at DESC);

These indexes help when fetching notifications by student, checking unread notifications, and filtering by notification type.

### Insert One Notification

Used by `POST /notifications`.

INSERT INTO notifications (
  id,
  student_id,
  notification_type,
  message
) VALUES (
  UUID(),
  ?,
  ?,
  ?
);

### Insert Notifications For Many Students

Used by `POST /notifications/bulk`.

INSERT INTO notifications (
  id,
  student_id,
  notification_type,
  message
) VALUES
  (UUID(), ?, ?, ?),
  (UUID(), ?, ?, ?),
  (UUID(), ?, ?, ?);

In code, this values list can be generated from the selected student ids.

### Fetch Notifications

Used by `GET /notifications?limit=10&page=1&notification_type=Placement`.

SELECT
  id,
  student_id,
  notification_type,
  message,
  is_read,
  created_at
FROM notifications
WHERE notification_type = COALESCE(?, notification_type)
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

The offset is calculated as:

(page - 1) * limit

### Mark One Notification As Read

Used by `PATCH /notifications/{notification_id}/read`.

UPDATE notifications
SET is_read = TRUE
WHERE id = ?;

### Mark All Notifications As Read

Used by `PATCH /notifications/read-all`.

UPDATE notifications
SET is_read = TRUE
WHERE student_id = ? AND is_read = FALSE;

### Problems As Data Increases

As the number of students and notifications grows, the main problems will be slow inbox reads, many unread checks, and large bulk inserts during placement season.

To handle this:

- Keep useful indexes on `student_id`, `is_read`, `notification_type`, and `created_at`.
- Always use pagination with `LIMIT` and `OFFSET`.
- Use bulk insert instead of inserting one row at a time.
- Archive very old notifications if the table becomes too large.

## Stage 3

The given query is:

SELECT *
FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;

The idea is correct because it is trying to fetch unread notifications for one student. The problem is that it can become slow when the table grows to lakhs of rows. If there is no proper index, MySQL may scan many rows before finding the matching student's unread notifications.

I would also avoid `SELECT *` and only fetch the fields needed by the API.

### Improved Query

Using the column names from my schema:

SELECT
  id,
  student_id,
  notification_type,
  message,
  is_read,
  created_at
FROM notifications
WHERE student_id = 1042
  AND is_read = FALSE
ORDER BY created_at DESC
LIMIT 20;

I changed the order to `DESC` because the latest notifications should normally appear first in an inbox.

### Index For This Query

CREATE INDEX idx_notifications_student_unread_created
ON notifications (student_id, is_read, created_at DESC);

This index is useful because the query filters by `student_id` and `is_read`, then sorts by `created_at`. MySQL can use the index instead of scanning the full table.

### Should We Add Indexes On Every Column?

No. Adding indexes on every column is not a good idea. Indexes improve reads, but they also take extra storage and make inserts/updates slower because MySQL has to update the indexes too.

For this project, indexes should be added only for common query patterns:

- fetching notifications for a student
- fetching unread notifications
- filtering by notification type
- sorting by created time

### Students Who Got Placement Notifications In The Last 7 Days

SELECT DISTINCT student_id
FROM notifications
WHERE notification_type = 'Placement'
  AND created_at >= NOW() - INTERVAL 7 DAY;

This gives the list of students who received at least one placement notification in the last 7 days.

## Stage 4

Fetching notifications from the database on every page load is not a good approach. If many students open different pages, the backend will keep running the same notification query again and again. This increases database load and can make the user experience slow.

### Suggested Approach

Use a small cache for the latest notifications and update the frontend only when needed.

Flow:

Frontend opens page
       |
Backend checks cache
       |
       -- cache hit -> return notifications
       |
       --  cache miss -> fetch from MySQL, store in cache, return notifications


### Real-Time Update

When a new notification is created:

1. Save it in MySQL.
2. Clear or update the cache for that student.
3. Emit a new_notification event through Socket.IO to connected clients.

This way the frontend does not need to fetch notifications on every page load.

### Tradeoffs

Caching improves speed and reduces database load, but it can show slightly old data for a short time. For notifications, a 30 to 60 second cache is acceptable. If the notification is urgent, Socket.IO can update the connected student immediately.

### Final Decision

I would use MySQL as the source of truth, a short-lived cache for repeated reads, pagination for large lists, and Socket.IO push for new notifications. This keeps the design simple while still solving the performance problem.

