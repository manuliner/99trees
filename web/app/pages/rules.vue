<template>
  <main class="p-4 max-w-md mx-auto space-y-4 pixel-card p-4">
    <h1 class="pixel-title text-base text-center">Game rules</h1>
    <div class="pixel-body text-sm space-y-3">
      <p>One phone per team. Roll the dice, find your field, scan the station QR, complete the task, then confirm your turn.</p>
      <p>Hints cost points. Waiting unlocks cheaper hints. Reveal all hints costs 50 points.</p>
      <p>If you cannot find the station, you may roll again (zero round) after all hints are available — no progress, no points.</p>
      <p>Highscore counts only for teams that reach the final field. Fastest migration breaks ties.</p>
    </div>
    <NuxtLink to="/join" class="pixel-body text-sm underline block text-center">Back</NuxtLink>
  </main>
</template>
