const bcrypt = require('bcryptjs');

// Generate a secure password hash for the default admin user
const password = 'ChangeMe123!';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }
});