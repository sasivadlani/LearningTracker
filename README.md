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

- **index.html**: The main HTML file for the application.
- **styles.css**: The CSS file for styling the application.
- **script.js**: The JavaScript file containing the application logic.
- **.github/workflows/jekyll-gh-pages.yml**: GitHub Actions workflow for deploying the site to GitHub Pages.

## Getting Started

### Prerequisites

- AWS account with DynamoDB setup.
- GitHub account for deploying to GitHub Pages.

### Installation

1. Clone the repository
2. Configure AWS:
   - Create a DynamoDB table named "LearningTracker"
   - Set up IAM user with appropriate DynamoDB permissions
   - Update AWS credentials in script.js:
   ```javascript
   AWS.config.update({
       region: "your-region",
       accessKeyId: "your-access-key-id",
       secretAccessKey: "your-secret-access-key"
   });
   ```
3. Deploy using GitHub Pages:
   - Enable GitHub Pages in repository settings
   - Ensure jekyll-gh-pages workflow is configured
   - Push changes to main branch

### Usage

1. Open [index.html] in a web browser.
2. Enter the password to log in.
3. Use the "Clock In" and "Clock Out" buttons to track learning sessions.
4. View and manage previous sessions in the session history table.
5. Use the distraction list to manage and track distractions.
6. Utilize the Pomodoro timer to stay focused with customizable work durations and notifications.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License.