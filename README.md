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
AWS EC2:
	get instance info: aws ec2 describe-instances
	connect to ssh: ssh -i <pem-file> instance-user-name@instance-public-dns-name
	default user name: ec2-user
	set ssh file lower permission: chmod 600 <pem-file>

	Connect:
	ssh -i ./credentials/thetan-sniper-ssh-key.pem ec2-user@ec2-3-144-221-57.us-east-2.compute.amazonaws.com

	Copy Files:
	scp -i ./credentials/thetan-sniper-ssh-key.pem <file-path> ec2-user@ec2-3-144-221-57.us-east-2.compute.amazonaws.com:/home/ec2-user/<path>

	Copy Directories:
	scp -i ./credentials/thetan-sniper-ssh-key.pem -r <folder-path> ec2-user@ec2-3-144-221-57.us-east-2.compute.amazonaws.com:/home/ec2-user/<path>

	Install Thetan Sniper:
		1. Copy dist folder
		2. Copy .env file
		3. Copy package.json
		4. Update ec2: sudo yum update -y
		5. Install git: sudo yum install git -y
		6. Install node: curl -L https://git.io/n-install | bash -s -- -y 
		7. Run: npm install
		8. Install pm2: npm install pm2 -g
		9. Run application: pm2 start main.js -- 0.3
		10. Monit with "pm2 monit" or cloudwatch