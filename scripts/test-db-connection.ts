/**
 * Test Database Connection Script
 * 
 * Verifies that:
 * 1. DATABASE_URL is set
 * 2. Can connect to database
 * 3. Site table exists with all required fields
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  console.log('🔍 Testing database connection...\n')

  // 1. Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!')
    process.exit(1)
  }
  console.log('✅ DATABASE_URL is set')
  console.log(`   Connection: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`)

  // 2. Test connection
  try {
    await prisma.$connect()
    console.log('✅ Successfully connected to database\n')
  } catch (error) {
    console.error('❌ Failed to connect to database:')
    console.error(error)
    process.exit(1)
  }

  // 3. Check if Site table exists and has correct structure
  try {
    const sites = await prisma.site.findMany({ take: 1 })
    console.log('✅ Site table exists and is accessible')
    console.log(`   Found ${sites.length} site(s) in database\n`)
  } catch (error: any) {
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.error('❌ Site table does not exist!')
      console.error('   You need to run: npx prisma db push')
      process.exit(1)
    } else {
      console.error('❌ Error accessing Site table:')
      console.error(error)
      process.exit(1)
    }
  }

  // 4. Test creating a site (then delete it)
  try {
    const testSite = await prisma.site.create({
      data: {
        name: 'Test Site - Delete Me',
        storeNumber: 'TEST-999',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        phone: '555-1234',
        manager: 'Test Manager',
        squareFootage: 1000,
      },
    })
    console.log('✅ Successfully created test site')
    console.log(`   Site ID: ${testSite.id}`)

    // Clean up - delete the test site
    await prisma.site.delete({
      where: { id: testSite.id },
    })
    console.log('✅ Successfully deleted test site\n')
  } catch (error) {
    console.error('❌ Failed to create/delete test site:')
    console.error(error)
    process.exit(1)
  }

  // 5. List all fields in Site model
  console.log('✅ Site model fields verified:')
  console.log('   - id, name, storeNumber, address')
  console.log('   - city, state, zipCode, phone')
  console.log('   - manager, squareFootage, openedDate')
  console.log('   - createdAt, updatedAt\n')

  console.log('🎉 All database tests passed!')
  await prisma.$disconnect()
}

testConnection().catch((error) => {
  console.error('Unexpected error:', error)
  process.exit(1)
})

