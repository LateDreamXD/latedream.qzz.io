const fetchData = async (name: 'avatars' | 'socials') => {
	const res = await fetch(`/assets/data/${name}.json`);
	if(!res.ok) throw new Error('fetch failed');
	else return await res.json() as Record<string, any>;
}

export { fetchData };