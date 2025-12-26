/**
 * Test script to verify image uploads work correctly
 * Tests both site images and library object images
 * 
 * Run: npx tsx scripts/test-image-uploads.ts
 */

const BASE_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000'

async function testImageUpload(endpoint: string, data: any, testName: string) {
  console.log(`\n🧪 Testing ${testName}...`)
  
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      console.log(`  Attempt ${attempt}/6...`)
      
      const input = encodeURIComponent(JSON.stringify(data))
      const response = await fetch(`${BASE_URL}/api/trpc/${endpoint}?batch=1&input=${input}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result[0]?.result?.data) {
          console.log(`  ✅ Attempt ${attempt} succeeded!`)
          return true
        } else if (result[0]?.error) {
          console.log(`  ❌ Attempt ${attempt} failed: ${result[0].error.message}`)
        } else {
          console.log(`  ❌ Attempt ${attempt} failed: Invalid response format`)
        }
      } else {
        const errorText = await response.text()
        console.log(`  ❌ Attempt ${attempt} failed: ${response.status} - ${errorText.substring(0, 100)}`)
      }
      
      // Wait before retry
      if (attempt < 6) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    } catch (error: any) {
      console.log(`  ❌ Attempt ${attempt} error: ${error.message}`)
      if (attempt < 6) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
  }
  
  console.log(`  ❌ All 6 attempts failed for ${testName}`)
  return false
}

async function main() {
  console.log('🚀 Starting image upload tests...')
  console.log(`Base URL: ${BASE_URL}`)
  
  // Test data
  const testSiteId = 'store-1234'
  const testLibraryId = 'lcm'
  const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  
  const results = {
    siteImageSave: false,
    siteImageGet: false,
    libraryImageSave: false,
    libraryImageGet: false,
  }
  
  // Test 1: Save site image
  results.siteImageSave = await testImageUpload(
    'image.saveSiteImage',
    { siteId: testSiteId, imageData: testImage },
    'Site Image Save'
  )
  
  // Test 2: Get site image
  results.siteImageGet = await testImageUpload(
    'image.getSiteImage',
    { siteId: testSiteId },
    'Site Image Get'
  )
  
  // Test 3: Save library image
  results.libraryImageSave = await testImageUpload(
    'image.saveLibraryImage',
    { libraryId: testLibraryId, imageData: testImage },
    'Library Image Save'
  )
  
  // Test 4: Get library image
  results.libraryImageGet = await testImageUpload(
    'image.getLibraryImage',
    { libraryId: testLibraryId },
    'Library Image Get'
  )
  
  // Summary
  console.log('\n📊 Test Results Summary:')
  console.log(`  Site Image Save: ${results.siteImageSave ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`  Site Image Get: ${results.siteImageGet ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`  Library Image Save: ${results.libraryImageSave ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`  Library Image Get: ${results.libraryImageGet ? '✅ PASS' : '❌ FAIL'}`)
  
  const allPassed = Object.values(results).every(r => r)
  if (allPassed) {
    console.log('\n✅ All tests passed!')
    process.exit(0)
  } else {
    console.log('\n❌ Some tests failed')
    process.exit(1)
  }
}

main().catch(console.error)

