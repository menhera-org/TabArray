all:
	npm run build

clean:
	npm run clean

icons:
	./shellscripts/update-firefox-assets.sh

amo-html:
	./shellscripts/build-amo-descriptions.sh
