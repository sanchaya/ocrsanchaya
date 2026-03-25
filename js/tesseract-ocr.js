$( document ).ready(function() {
	var inputs = document.querySelectorAll( '.inputfile' );
	Array.prototype.forEach.call( inputs, function( input )
	{
		var label	 = input.nextElementSibling,
			labelVal = label.innerHTML;

		input.addEventListener( 'change', function( e )
		{
			var fileName = '';
			if( this.files && this.files.length > 1 )
				fileName = ( this.getAttribute( 'data-multiple-caption' ) || '' ).replace( '{count}', this.files.length );
			else
				fileName = e.target.value.split( '\\' ).pop();

			if( fileName ){
				label.querySelector( 'span' ).innerHTML = fileName;

				let reader = new FileReader();
				reader.onload = function () {
					let dataURL = reader.result;
					$("#selected-image").attr("src", dataURL);
					$("#selected-image").addClass("col-12");
				}
				let file = this.files[0];
				reader.readAsDataURL(file);
				
				var fileType = file.type || file.name.toLowerCase().split('.').pop();
				if (fileType === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')) {
					processPDF(file);
				} else {
					startRecognize(file);
				}
			}
			else{
				label.innerHTML = labelVal;
				$("#selected-image").attr("src", '');
				$("#selected-image").removeClass("col-12");
				$("#arrow-right").addClass("fa-arrow-right");
				$("#arrow-right").removeClass("fa-check");
				$("#arrow-right").removeClass("fa-spinner fa-spin");
				$("#arrow-down").addClass("fa-arrow-down");
				$("#arrow-down").removeClass("fa-check");
				$("#arrow-down").removeClass("fa-spinner fa-spin");
				$("#log").empty();
			}
		});

		// Firefox bug fix
		input.addEventListener( 'focus', function(){ input.classList.add( 'has-focus' ); });
		input.addEventListener( 'blur', function(){ input.classList.remove( 'has-focus' ); });
	});
});

$("#startLink").click(function () {
	var img = document.getElementById('selected-image');
	startRecognize(img);
});

function processPDF(file) {
	$("#arrow-right").removeClass("fa-arrow-right");
	$("#arrow-right").addClass("fa-spinner fa-spin");
	$("#arrow-down").removeClass("fa-arrow-down");
	$("#arrow-down").addClass("fa-spinner fa-spin");
	$("#log").html('<div class="status">Processing PDF...</div>');
	
	var reader = new FileReader();
	reader.onload = function(e) {
		var typedarray = new Uint8Array(e.target.result);
		
		pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
			var totalPages = pdf.numPages;
			var currentPage = 1;
			var fullText = "";
			
			function processPage(pageNum) {
				return pdf.getPage(pageNum).then(function(page) {
					var viewport = page.getViewport({ scale: 1.5 });
					var canvas = document.createElement('canvas');
					var context = canvas.getContext('2d');
					canvas.height = viewport.height;
					canvas.width = viewport.width;
					
					return page.render({ canvasContext: context, viewport: viewport }).promise.then(function() {
						$("#log").html('<div class="status">Processing page ' + pageNum + ' of ' + totalPages + '...</div>');
						return canvas.toDataURL('image/png');
					});
				}).then(function(dataURL) {
					return new Promise(function(resolve) {
						var img = new Image();
						img.onload = function() {
							var tempWorker = new Tesseract.TesseractWorker({
								corePath: window.navigator.userAgent.indexOf("Edge") > -1
									? 'js/tesseract-core.asm.js'
									: 'js/tesseract-core.wasm.js'
							});
							tempWorker.recognize(img, $("#langsel").val())
								.then(function(result) {
									fullText += result.data.text + "\n\n";
									resolve();
								});
						};
						img.src = dataURL;
					});
				});
			}
			
			var pagePromises = [];
			for (var i = 1; i <= totalPages; i++) {
				pagePromises.push(processPage(i));
			}
			
			Promise.all(pagePromises).then(function() {
				$("#log").html('');
				var pre = document.createElement('pre');
				pre.appendChild(document.createTextNode(fullText.replace(/\n\s*\n/g, '\n')));
				$("#log").append(pre);
				$("#editable-text").val(fullText.replace(/\n\s*\n/g, '\n'));
				$(".fas").removeClass('fa-spinner fa-spin');
				$(".fas").addClass('fa-check');
			});
		});
	};
	reader.readAsArrayBuffer(file);
}

function startRecognize(img){
	$("#arrow-right").removeClass("fa-arrow-right");
	$("#arrow-right").addClass("fa-spinner fa-spin");
	$("#arrow-down").removeClass("fa-arrow-down");
	$("#arrow-down").addClass("fa-spinner fa-spin");
	recognizeFile(img);
}

function progressUpdate(packet){
	var log = document.getElementById('log');

	if(log.firstChild && log.firstChild.status === packet.status){
		if('progress' in packet){
			var progress = log.firstChild.querySelector('progress')
			progress.value = packet.progress
		}
	}else{
		var line = document.createElement('div');
		line.status = packet.status;
		var status = document.createElement('div')
		status.className = 'status'
		status.appendChild(document.createTextNode(packet.status))
		line.appendChild(status)

		if('progress' in packet){
			var progress = document.createElement('progress')
			progress.value = packet.progress
			progress.max = 1
			line.appendChild(progress)
		}


		if(packet.status == 'done'){
			log.innerHTML = ''
			var pre = document.createElement('pre')
			pre.appendChild(document.createTextNode(packet.data.text.replace(/\n\s*\n/g, '\n')))
			line.innerHTML = ''
			line.appendChild(pre)
			$(".fas").removeClass('fa-spinner fa-spin')
			$(".fas").addClass('fa-check')
			
			$("#editable-text").val(packet.data.text.replace(/\n\s*\n/g, '\n'));
		}

		log.insertBefore(line, log.firstChild)
	}
}

function recognizeFile(file){
	$("#log").empty();
  	const corePath = window.navigator.userAgent.indexOf("Edge") > -1
    ? 'js/tesseract-core.asm.js'
    : 'js/tesseract-core.wasm.js';


	const worker = new Tesseract.TesseractWorker({
		corePath,
	});

	worker.recognize(file,
		$("#langsel").val()
	)
		.progress(function(packet){
			console.info(packet)
			progressUpdate(packet)

		})
		.then(function(data){
			console.log(data)
			progressUpdate({ status: 'done', data: data })
		})
}

$("#export-txt").click(function() {
	var text = $("#editable-text").val();
	if(!text) {
		alert("No text to export!");
		return;
	}
	var blob = new Blob([text], { type: "text/plain" });
	var url = URL.createObjectURL(blob);
	var a = document.createElement("a");
	a.href = url;
	a.download = "ocr-result.txt";
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
});

$("#export-docx").click(function() {
	var text = $("#editable-text").val();
	if(!text) {
		alert("No text to export!");
		return;
	}
	
	var docText = text.replace(/\n/g, "\r\n");
	var header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>OCR Result</title></head><body>";
	var footer = "</body></html>";
	var sourceHTML = header + docText.replace(/\n/g, "<br>") + footer;
	
	var source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
	var a = document.createElement("a");
	a.href = source;
	a.download = "ocr-result.doc";
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
});