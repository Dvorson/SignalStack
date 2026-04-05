'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (creating) return;
    setCreating(true);

    fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then(res => res.json())
      .then(data => {
        router.replace(`/chat/${data.chat.id}`);
      })
      .catch(() => {
        // If chat creation fails, still show something
        setCreating(false);
      });
  }, [router, creating]);

  return (
    <div className="flex items-center justify-center h-dvh">
      <div className="text-center">
        <div className="text-data font-mono text-sm animate-pulse">Starting new chat...</div>
      </div>
    </div>
  );
}
