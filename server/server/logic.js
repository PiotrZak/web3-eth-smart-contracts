var counter;

function setCount(num=0){
    counter = num;
}
function inc(){
    counter = counter == null ? 1 : counter+1;
}
function getCount(){
    console.log(counter);
    return counter;
}
module.exports = {
    inc: inc,
    setCount: setCount,
    getCount: getCount
};
