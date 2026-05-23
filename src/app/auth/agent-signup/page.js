'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AgentSignupPage() {
  const [step, setStep] = useState(1)
  const [accountType, setAccountType] = useState('agent')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [userId, setUserId] = useState(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseState, setLicenseState] = useState('')
  const [brokerage, setBrokerage] = useState('')
  const [serviceArea, setServiceArea] = useState('')

  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')
  const [showExperience, setShowExperience] = useState(true)
  const [phoneContactAllowed, setPhoneContactAllowed] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  async function handleStep1(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: accountType === 'fsbo' ? 'fsbo' : 'agent',
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    setUserId(data.user.id)
    setLoading(false)

    if (accountType === 'fsbo') {
      setStep(3)
    } else {
      setStep(2)
    }
  }

  async function handleStep2(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: agentError } = await supabase.from('agents').insert({
      id: userId,
      license_number: licenseNumber,
      license_state: licenseState,
      brokerage,
      service_area: serviceArea,
      is_fsbo: false,
      is_verified: false,
    })

    if (agentError) {
      setError(agentError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setStep(3)
  }

  async function handleStep3(e) {
  e.preventDefault()
  setLoading(true)
  setError(null)

  const { data: { user } } = await supabase.auth.getUser()
  const currentUserId = userId || user?.id

  if (!currentUserId) {
    setError('Session expired. Please sign up again.')
    setLoading(false)
    return
  }

  const { error: agentError } = await supabase
    .from('agents')
    .upsert({
      id: currentUserId,
      phone,
      bio,
      years_experience: yearsExperience ? parseInt(yearsExperience) : null,
      show_years_experience: showExperience,
      phone_contact_allowed: phoneContactAllowed,
      is_fsbo: accountType === 'fsbo',
      is_verified: false,
    })

  if (agentError) {
    setError(agentError.message)
    setLoading(false)
    return
  }

  setLoading(false)
  await new Promise(resolve => setTimeout(resolve, 500))
  router.push('/agent/dashboard')
}
async function skipStep3() {
  const { data: { user } } = await supabase.auth.getUser()
  const currentUserId = userId || user?.id

  if (currentUserId) {
    await supabase.from('agents').upsert({
      id: currentUserId,
      is_fsbo: accountType === 'fsbo',
      is_verified: false,
      phone_contact_allowed: false,
      show_years_experience: true,
    })
  }

  await new Promise(resolve => setTimeout(resolve, 500))
  router.push('/agent/dashboard')
}
  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 text-gray-900 bg-white placeholder-gray-400"

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-6">
          <h1 className="text-2xl font-medium text-gray-900">
            {step === 1 && 'Create your account'}
            {step === 2 && 'Your license info'}
            {step === 3 && 'Set up your profile'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === 1 && 'Free to list. No commission fees.'}
            {step === 2 && 'Used for verification only. Not shown publicly.'}
            {step === 3 && 'This is what buyers see on your listings.'}
          </p>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                n < step ? 'bg-gray-900 text-white' :
                n === step ? 'bg-gray-900 text-white' :
                'bg-gray-100 text-gray-400'
              }`}>
                {n < step ? '✓' : n}
              </div>
              {n < 3 && (
                <div className={`flex-1 h-px ${n < step ? 'bg-gray-900' : 'bg-gray-200'}`}></div>
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <form onSubmit={handleStep1} className="flex flex-col gap-3">
            <div className="flex border border-gray-200 rounded-lg overflow-hidden mb-2">
              <Link
                href="/signup"
                className="flex-1 py-2 text-center text-sm text-gray-400 hover:bg-gray-50 transition"
              >
                Buyer
              </Link>
              <div className="flex-1 py-2 text-center text-sm font-medium bg-gray-900 text-white">
                Agent / FSBO
              </div>
            </div>

            <div className="flex border border-gray-200 rounded-lg overflow-hidden mb-2">
              <button
                type="button"
                onClick={() => setAccountType('agent')}
                className={`flex-1 py-2 text-center text-sm transition ${
                  accountType === 'agent'
                    ? 'bg-gray-900 text-white font-medium'
                    : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                Licensed agent
              </button>
              <button
                type="button"
                onClick={() => setAccountType('fsbo')}
                className={`flex-1 py-2 text-center text-sm transition ${
                  accountType === 'fsbo'
                    ? 'bg-gray-900 text-white font-medium'
                    : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                For sale by owner
              </button>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Full name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className={inputClass} placeholder="Sarah Mitchell" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} placeholder="sarah@kwaustin.com" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className={inputClass} placeholder="••••••••" />
            </div>

            {accountType === 'fsbo' && (
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 leading-relaxed">
                As a For Sale By Owner seller you can list your property directly. License info is not required.
              </div>
            )}

            {error && <p className="text-xs text-red-500 text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50 mt-1"
            >
              {loading ? 'Creating account...' : 'Continue →'}
            </button>

            <p className="text-center text-xs text-gray-500 mt-2">
              Already have an account?{' '}
              <Link href="/login" className="text-gray-900 font-medium">Sign in</Link>
            </p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">License number</label>
              <input type="text" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} required className={inputClass} placeholder="TX-12345678" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">State licensed in</label>
              <select value={licenseState} onChange={e => setLicenseState(e.target.value)} required className={inputClass}>
                <option value="">Select state...</option>
                {['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Brokerage name</label>
              <input type="text" value={brokerage} onChange={e => setBrokerage(e.target.value)} required className={inputClass} placeholder="Keller Williams Austin" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Primary service area</label>
              <input type="text" value={serviceArea} onChange={e => setServiceArea(e.target.value)} required className={inputClass} placeholder="Austin, TX and surrounding areas" />
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 leading-relaxed">
              Your account will be reviewed within 24 hours. You can start uploading listings while we verify.
            </div>

            {error && <p className="text-xs text-red-500 text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Continue →'}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full border border-gray-200 text-gray-500 rounded-lg py-2.5 text-sm hover:bg-gray-50 transition"
            >
              ← Back
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleStep3} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Phone number</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="(512) 555-0192" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Allow buyers to call you directly?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPhoneContactAllowed(true)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition ${
                    phoneContactAllowed
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setPhoneContactAllowed(false)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition ${
                    !phoneContactAllowed
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Email only
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Years of experience <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                value={yearsExperience}
                onChange={e => setYearsExperience(e.target.value)}
                className={inputClass}
                placeholder="10"
                min="0"
                max="60"
                disabled={!showExperience}
              />
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!showExperience}
                  onChange={e => setShowExperience(!e.target.checked)}
                  className="rounded"
                />
                <span className="text-xs text-gray-500">Don't show years of experience on my profile</span>
              </label>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Bio <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                className={inputClass}
                placeholder="10+ years in Austin real estate..."
                rows={3}
              />
            </div>

            {error && <p className="text-xs text-red-500 text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Finish & go to dashboard'}
            </button>
            <button
              type="button"
              onClick={skipStep3}
              className="w-full text-gray-400 text-sm py-2 hover:text-gray-600 transition"
            >
              Skip for now →
            </button>
          </form>
        )}

      </div>
    </div>
  )
}