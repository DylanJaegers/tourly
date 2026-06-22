const fs = require('fs');
const filePath = 'src/components/shared/sidebar-nav.js';
let content = fs.readFileSync(filePath, 'utf8');

// Add agent/fsbo role check to the useEffect
content = content.replace(
  "  const [user, setUser] = useState(null)",
  "  const [user, setUser] = useState(null)\n  const [isAgent, setIsAgent] = useState(false)"
);

content = content.replace(
  `  useEffect(() => {
    supabase.auth.getUser().then(function(res) {
      setUser(res.data ? res.data.user : null)
    })
  }, [])`,
  `  useEffect(() => {
    supabase.auth.getUser().then(async function(res) {
      const currentUser = res.data ? res.data.user : null
      setUser(currentUser)
      if (currentUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', currentUser.id)
          .single()
        if (userData && (userData.role === 'agent' || userData.role === 'fsbo')) {
          setIsAgent(true)
        }
      }
    })
  }, [])`
);

// Add My Listing Dashboard link after the Profile nav item
content = content.replace(
  `          <button onClick={() => router.push(user ? '/profile' : '/auth/login')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition w-full text-left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Profile
          </button>`,
  `          <button onClick={() => router.push(user ? '/profile' : '/auth/login')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition w-full text-left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Profile
          </button>
          {isAgent && (
            <>
              <div className="my-2 border-t border-zinc-800"></div>
              <button onClick={() => router.push('/agent/dashboard')}
                className={'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition w-full text-left ' + (pathname === '/agent/dashboard' || pathname.startsWith('/agent/') ? 'bg-white text-black font-semibold' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                My Listing Dashboard
              </button>
            </>
          )}`
);

fs.writeFileSync(filePath, content);
console.log('Done - added My Listing Dashboard to sidebar for agents only');
