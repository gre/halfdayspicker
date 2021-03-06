/**
 * Widget displaying a date interval
 * @param settings An object containing the following fields:
 *                 - elm: a jQuery element corresponding to the input elements. The interval picker widget expects
 *                 that node to contain children following these conventions:
 *                   - 'start-date' class for the start date input element ;
 *                   - 'start-morning' and 'start-afternoon' classes for the 'Matin' and 'Après-midi' checkboxes ;
 *                   - 'stop-date' class for the end date input element ;
 *                   - 'stop-morning' and 'stop-afternoon' classes for the 'Matin' and 'Après-midi' checkboxes
 *                  - dateFormat (optional): the date format to use (default 'dd/MM/yyyy')
 */
var HalfDaysPicker = function(settings) {
    var self = this; // Avoid ambiguities in nested functions
    
    self.node = $(settings.elm);
    
    // Compute the model. FIXME I would like to factorize these two structures
    self.start = {
        elm: self.node.find('.start'), // The root element
        input: self.node.find('.start-date'), // The date input field
        morning: self.node.find('.start-morning'), // The morning checkbox
        afternoon: self.node.find('.start-afternoon'), // The afternoon checkbox
        view: null // A future reference to the dd element corresponding to the start time
    }
    self.stop = {
        elm: self.node.find('.stop'),
        input: self.node.find('.stop-date'),
        morning: self.node.find('.stop-morning'),
        afternoon: self.node.find('.stop-afternoon'),
        view: null
    }
    
    self.retrieveHalfdays = settings.getHalfdaysStatus ? settings.getHalfdaysStatus : function(from, to, callback) { callback([]); };
    
    self.monthNumber = settings.monthNumber ? settings.monthNumber : 2;
    
    self.format = settings.dateFormat ? settings.dateFormat : 'dd/MM/yyyy';
    self.widget = null;
    
    self.onchange = settings.onchange ? settings.onchange : function(){};
    
    self.i18n = $.fn.extend({
      previousMonth: 'Previous month',
      nextMonth: 'Next month'
    }, settings.i18n);
    
    self.render = function() {
        var startDate = self.start.view;
        var endDate = self.stop.view;
        
        // Clear previous interval
        self.widget.find('dd.selected').removeClass('selected');
        self.widget.find('dd.included').removeClass('included');
        
        // Show the new interval
        if (startDate) { // Show the selected start date
            $(startDate).addClass('selected');
        }
        if (endDate) { // Show the selected end date
            $(endDate).addClass('selected');
        }
        if (startDate && endDate) { // Show the interval
            var dds = self.widget.find('dd');
            var startIndex = dds.index(startDate);
            var endIndex = dds.index(endDate);
            dds.filter(':lt('+endIndex+')').filter(':gt('+startIndex+')').addClass('included');
        }
    };
    
    self.updateHalfdays = function() {
      var allDays = self.widget.find('.day');
      var from = allDays.first().data('time');
      var to = allDays.last().data('time');
      self.retrieveHalfdays(from, to, function(days){
        for(var d=0; d<days.length; ++d) {
          var day = days[d];
          var dayContainer = allDays.filter(function(){
            return $(this).data('time')==day.date;
          });
          var texts = day.classes.split(/\s+/);
          var types = self.i18n.types;
          for(var t=0; t<texts.length; ++t)
            if(types[ texts[t] ])
              texts[t] = types[ texts[t] ];
          var text = texts.join(', ');
          if(day.morning) {
            $('.morning', dayContainer).addClass(day.classes)
            .filter('dt').text(text);
          }
          if(day.afternoon) {
            $('.afternoon', dayContainer).addClass(day.classes)
            .filter('dt').text(text);
          }
        }
        self.widget.show();
      });
    }
    
    self.updateWithInputs = function() {
      var allDays = self.widget.find('.day');
      var dayFrom = allDays.filter(function(){
        return $(this).data('time')==self.start.input.val();
      });
      var dayTo = allDays.filter(function(){
        return $(this).data('time')==self.stop.input.val();
      });
      self.start.view = dayFrom.find('dd').filter(self.start.morning.is(':checked') ? '.morning' : '.afternoon');
      self.stop.view = dayTo.find('dd').filter(!self.stop.afternoon.is(':checked') ? '.morning' : '.afternoon');
      if(self.start.view.length==0) self.start.view = null;
      if(self.stop.view.length==0) self.stop.view = null;
      self.render();
    }
    
    var currentMonth = Date.today();
    self.getCurrentStartMonth = function() {
      return currentMonth.clone();
    }
    self.generateWidget = function(startMonth) {
        currentMonth = startMonth.clone().set({ day: 1 });
        var today = Date.today();
        
        if(self.widget) self.widget.remove();
        self.widget = $('<div class="halfdayspicker" />');
        var ul = $('<ul />');
        var month = currentMonth.clone();
        for(var m=0; m<self.monthNumber; ++m, month.addMonths(1)) {
          var monthText = month.toString("MMMM yyyy");
          var monthLi = $('<li />');
          monthLi.append('<h3>'+monthText+'</h3>');
          var daysContainer = $('<div class="days" />');
          
          var monthNum = month.getMonth();
          for(var day = month.set({ day: 1 }).clone(); day.getMonth() == monthNum; day.addDays(1)) {
            var dayNode = $('<div class="day" />');
            if(today.getYear() == day.getYear()) {
              // In France, we begin with Monday
              if(today.getWeekOfYear() == day.getWeekOfYear() && day.getDay()>0 || today.getWeekOfYear()+1 == day.getWeekOfYear() && day.getDay()==0)
                dayNode.addClass('currentWeek');
              if(today.getDayOfYear() == day.getDayOfYear())
                dayNode.addClass('currentDay');
            }
            dayNode.addClass('dayOfWeek-'+day.getDay());
            dayNode.data('time', day.toString(self.format));
            dayNode.append('<span class="dayNum">'+day.toString('dd')+'</span>');
            dayNode.append('<dl><dt class="morning"></dt><dd class="morning">M</dd></dl>');
            dayNode.append('<dl><dt class="afternoon"></dt><dd class="afternoon">A</dd></dl>');
            daysContainer.append(dayNode);
          }
          monthLi.append(daysContainer);
          ul.append(monthLi);
        }
        var upLink = $('<a href="#" class="monthUp" />').text(self.i18n.previousMonth).click(function(){ self.addMonths(-1) });
        var downLink = $('<a href="#" class="monthDown" />').text(self.i18n.nextMonth).click(function(){ self.addMonths(1) });
        var actions = $('<div class="actions" />').append(upLink).append(downLink);
        self.widget.append(actions);
        self.widget.append(ul);
        self.node.after(self.widget);
        
        self.updateHalfdays();
        self.updateWithInputs();
    }
    
    self.addMonths = function(n) {
      var month = self.getCurrentStartMonth();
      month.addMonths(n);
      self.generateWidget(month);
    }
    
    
    var guessBestCenter = function() {
      var d = null;
      var startVal = self.start.input.val();
      if(startVal) d = Date.parseExact (startVal, self.format);
      if(!d) d = Date.today();
      return d;
    }
    
    /**
     * get a month centered on today or on startDate input if available
     */
    var guessBestStartMonth = function() {
      var refDate = guessBestCenter();
      refDate.addDays(-15*self.monthNumber);
      if(refDate.getDate() > 15) refDate.addMonths(1);
      return refDate;
    }
    
    
    var onPeriodChange = function(){
      self.node.trigger('halfdayspicker-change');
    }
    self.node.bind('halfdayspicker-change', self.onchange);
    
    /**
     * Set the date of a given model
     * @param model An object like self.start or self.stop
     * @param date The jQuery element of the dd containing the date
     */
    var setDate = function(model, date) {
        model.view = date;
        // Clear checkboxes
        if(date) {
          model.input.val(date.parents('.day').data('time'));
          if(date.is('.morning')) {
            model.morning.attr('checked', 'checked');
            model.afternoon.removeAttr('checked');
          } else {
            model.afternoon.attr('checked', 'checked');
            model.morning.removeAttr('checked');
          }
        }
        else {
          model.input.val("");
        }
    };
    
    var setDates = function(a, b, updateInputs) {
      var dds = self.widget.find('dd');
      if(a==null) {
        a = b;
        b = null;
      }
      if(a!=null && b!=null) {
        if(dds.index(a) > dds.index(b)) {
          var tmp = b;
          b = a;
          a = tmp;
        }
      }
      if(updateInputs) {
        setDate(self.start, a);
        setDate(self.stop, b);
        onPeriodChange();
      }
      else {
        self.start.view = a;
        self.stop.view = b;
      }
      self.render();
    }
    
    /// Bind Events
    
    self.bindAll = function() {
      
        var mousePressed = false;
        var selectDragging = false;
        var selectIsStart = false;
        var targetDown = null;
        
        var onSelectDrag = function(target, updateInputs) {
          setDates(target, selectIsStart ? self.stop.view : self.start.view, updateInputs);
        }
        
        $(window).bind('mouseup', function(e){
          var target = $(e.target);
          if(target.is('dd') && target.parents('.halfdayspicker')[0] == self.widget[0]) {
            if(selectDragging && self.start.view && self.stop.view) {
              onSelectDrag(target, true);
            }
            else {
              if(targetDown && target[0] == targetDown[0]) {
                setDates(target, self.start.view, true);
              }
              else {
                setDates(targetDown, target, true);
              }
            }
          }
          else {
            setDates(self.start.view, self.stop.view, true); // mouse go out but drag is finished
          }
          mousePressed = false;
          selectDragging = false;
        });
        $(window).bind('mousedown', function(e){
          mousePressed = true;
          var target = $(e.target);
          if(target.is('dd') && target.parents('.halfdayspicker')[0] == self.widget[0]) {
            targetDown = target;
            if(target.is('.selected')) {
              selectDragging = true;
              selectIsStart = targetDown[0] == self.start.view[0];
            }
            else {
              selectDragging = false;
              if(self.stop.view) {
                setDates(null, null, false);
              }
            }
          }
        });
        $(window).bind('mousemove', function(e){
          var target = $(e.target);
          if(target.is('dd') && target.parents('.halfdayspicker')[0] == self.widget[0]) {
            if(mousePressed) {
              if(selectDragging && self.start.view && self.stop.view) {
                onSelectDrag(target, false);
              }
              else if(mousePressed) {
                setDates(targetDown, target, false);
              }
            }
          }
        });
        
        $('input', self.node).change(function() {
          self.updateWithInputs();
          // Update range if range visible
          var bestDate = guessBestCenter();
          var startMonth = self.getCurrentStartMonth();
          var endMonth = self.getCurrentStartMonth();
          endMonth.addMonths(self.monthNumber);
          if(!bestDate.between(startMonth, endMonth))
            self.generateWidget(guessBestStartMonth());
        });
    }
    
    self.refresh = function() {
      self.generateWidget(guessBestStartMonth());
      onPeriodChange();
    }
    
    /// Init
    
    self.refresh();
    self.bindAll();
}

