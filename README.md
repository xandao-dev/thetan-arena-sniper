Installation

Install VLC:
	Ubuntu: 
	```bash
	sudo apt install vlc
	sudo apt install vlc-plugin-access-extra libbluray-bdj libdvdcss2
	```

Run

Arguments:
	1: Earn expect percentage (example: 0.3)


Run without stop:
	1. Install pm2:
		```bash
		sudo npm install pm2 -g
		```
	2. Run:
		```bash
		pm2 start ./dist/main.js -- 0.3
		```
	3. Monitor:
		```bash
		pm2 monit
		```
	4. Stop:
		```bash
		pm2 stop all
		```