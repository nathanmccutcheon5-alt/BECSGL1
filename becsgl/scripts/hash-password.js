// Run this once to generate your commissioner password hash:
//   node scripts/hash-password.js yourpasswordhere
//
// Then paste the output as COMMISSIONER_PASSWORD_HASH in your .env.local

const bcrypt = require('bcryptjs')
const password = process.argv[2]
if (!password) { console.error('Usage: node scripts/hash-password.js <password>'); process.exit(1) }
bcrypt.hash(password, 12).then(hash => {
  console.log('\nAdd this to your .env.local:\n')
  console.log('COMMISSIONER_PASSWORD_HASH=' + hash)
  console.log()
})
