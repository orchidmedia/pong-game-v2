import { W, H, PAD_H } from './constants';
export function createInitialState() {
    return {
        left: { y: H / 2 - PAD_H / 2, score: 0 },
        right: { y: H / 2 - PAD_H / 2, score: 0 },
        ball: { x: W / 2, y: H / 2, vx: 4, vy: 3 },
        aiTarget: H / 2,
    };
}
export function resetBall(state, dir) {
    state.ball.x = W / 2;
    state.ball.y = H / 2;
    state.ball.vx = 4 * dir;
    state.ball.vy = (Math.random() * 4 + 2) * (Math.random() < 0.5 ? 1 : -1);
    state.aiTarget = H / 2;
}
