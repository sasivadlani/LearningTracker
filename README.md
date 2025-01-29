# Learning Tracker

Learning Tracker is a web application that allows users to track their learning sessions, manage distractions, and stay focused using a Pomodoro timer. The application uses AWS DynamoDB for data persistence.

## Features

- **Login**: Secure single user login with a password
- **Clock In/Clock Out**: Track the start and end times of learning sessions
- **Session History**: View and manage previous learning sessions with collapsible date-based grouping
- **Distraction List**: Manage a list of distractions to stay focused
- **Pomodoro Timer**: Built-in timer with customizable work duration and notifications
- **AWS Integration**: Store session data in AWS DynamoDB with automatic sync
- **Comment System**: Add and edit comments for each learning session
- **Responsive Design**: Works on both desktop and mobile devices

## Technical Features

- Real-time timer updates for both learning sessions and Pomodoro timer
- Session state persistence using sessionStorage
- Automatic data syncing with DynamoDB
- Browser notifications for Pomodoro timer completion
- Mobile-responsive table layouts with horizontal scrolling
- Collapsible session history grouped by date

## Project Structure

- **index.html**: The main HTML file for the application
- **styles.css**: The CSS file for styling the application
- **script.js**: The JavaScript file containing the application logic
- **.github/workflows/jekyll-gh-pages.yml**: GitHub Actions workflow for deploying the site to GitHub Pages

## Getting Started

### Prerequisites

- AWS account with DynamoDB setup
- GitHub account for deploying to GitHub Pages

### Installation

1. Clone the repository
2. Configure AWS:
   - Create a DynamoDB table named "LearningTracker"
   - Set up IAM user with appropriate DynamoDB permissions
   - Update AWS credentials in script.js
3. Deploy using GitHub Pages or serve locally

### Configuration

Update the AWS configuration in script.js:

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