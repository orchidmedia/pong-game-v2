import { initFirebase } from '@/features/firebase/setup';
import { initAuth, signInGoogle, signInGithub, doSignOut } from '@/features/firebase/auth';
import { initGame, selectMode, selectDiff, startGame, togglePause, goToMenu, showLeaderboard, showMenu, clearLocalScores, createRoom, joinRoom, cancelRoom, showJoinForm, showOlChoice, saveGuestName, showNameSaved, toggleSound, } from '@/game';
// Initialise Firebase and Auth
initFirebase();
initAuth();
// Initialise game
initGame();
window.selectMode = selectMode;
window.selectDiff = selectDiff;
window.startGame = startGame;
window.togglePause = togglePause;
window.goToMenu = goToMenu;
window.showLeaderboard = showLeaderboard;
window.showMenu = showMenu;
window.clearLocalScores = clearLocalScores;
window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.cancelRoom = cancelRoom;
window.showJoinForm = showJoinForm;
window.showOlChoice = showOlChoice;
window.saveGuestName = saveGuestName;
window.showNameSaved = showNameSaved;
window.toggleSound = toggleSound;
window.signInGoogle = signInGoogle;
window.signInGithub = signInGithub;
window.doSignOut = doSignOut;
