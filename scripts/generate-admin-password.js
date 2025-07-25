const bcrypt = require('bcryptjs');

// Generate a secure password hash for the default admin user
const password = 'ChangeMe123!';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }
  
  console.log('Password hash for admin@buildasoil.com:');
  console.log(hash);
  console.log('\nUpdate the migration file with this hash.');
  console.log('IMPORTANT: Change this password immediately after first login!');
});