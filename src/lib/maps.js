export async function geocodeAddress(address, city, state, zip) {
  const fullAddress = address + ', ' + city + ', ' + state + ' ' + zip
  const encodedAddress = encodeURIComponent(fullAddress)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  console.log('Geocoding address:', fullAddress)
  console.log('API key exists:', !!apiKey)

  try {
    const res = await fetch(
      'https://maps.googleapis.com/maps/api/geocode/json?address=' + encodedAddress + '&key=' + apiKey
    )
    const data = await res.json()

    console.log('Geocoding response status:', data.status)
    console.log('Geocoding response:', data)

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location
      console.log('Coordinates found:', location)
      return { lat: location.lat, lng: location.lng }
    }
    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}