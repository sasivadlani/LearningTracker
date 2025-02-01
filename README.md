# Learning Tracker

A web-based application for tracking learning sessions and managing study time with analytics visualization.

## Features

### Core Features
- Secure login system with user authentication
- Clock In/Out functionality to track learning sessions
- Topic-based session tracking
- Detailed session history with date grouping
- Distraction list management with three states (unchecked, intermediate, checked)
- Real-time session timer
- Local time display

### Analytics
- Weekly study time visualization with pie chart
- Daily study time tracking with stacked column chart
- Category-based time tracking
- Data export functionality to CSV

### Session Management
- Edit and delete existing sessions
- Add comments to sessions
- Collapsible date-based session groups
- Responsive table layout for session history

## Technical Implementation

### Storage
- AWS DynamoDB for data persistence
- Session-based authentication state
- Automatic data syncing

### Visualizations
- Google Charts integration for analytics
- Interactive pie chart for weekly category summary
- Stacked column chart for daily study time

### UI/UX
- Responsive design for mobile and desktop
- Bootstrap-based layout
- Real-time updates for timer and session data
- Collapsible sections for better organization

## Setup

1. Configure AWS credentials in script.js:
```javascript
AWS.config.update({
    region: "your-region",
    accessKeyId: "your-access-key-id",
    secretAccessKey: "your-secret-access-key"
});
```

### Usage

1. Enter your user ID and password to log in
2. Enter a topic and use "Clock In" to start tracking
3. Use "Clock Out" when you're done with a session
4. View your session history grouped by date
5. Add and manage distractions in the todo list
6. Use the Pomodoro timer to maintain focus:
   - Set custom work duration
   - Receive notifications when timer completes
   - Start/reset timer as needed

### Security Notes

- Keep your AWS credentials secure
- Don't commit credentials to version control
- Use environment variables in production

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License